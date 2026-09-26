import { useEffect, useRef } from "react";
import type { BackendUser } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  loginThunk,
  verifyOtpThunk,
  resendOtpThunk,
  restoreSessionThunk,
  logoutThunk,
} from "@/store/authSlice";

export interface User extends BackendUser { }

export interface LoginResult {
  success: boolean;
  error?: string;
  requiresOtp?: boolean;
  verificationId?: string;
}

function decodeTokenPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - (base64.length % 4)) % 4;
    base64 += "=".repeat(padLength);

    let jsonPayload: string;
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      jsonPayload = new TextDecoder("utf-8").decode(bytes);
    } catch {
      jsonPayload = atob(base64);
    }

    const payload = JSON.parse(jsonPayload);
    if (payload && typeof payload === "object") {
      return payload as { exp?: number };
    }
    return null;
  } catch {
    return null;
  }
}

// Milliseconds until the token's exp claim, or null if it can't be read.
function getMsUntilExpiry(token: string): number | null {
  const payload = decodeTokenPayload(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000 - Date.now();
}

// Refresh this far ahead of actual expiry so an active user's request never
// races a just-expired access token.
const REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1000;

/**
 * Auth state now lives in Redux (see src/store/authSlice.ts) rather than in
 * this context. This hook is kept as the stable call site the rest of the
 * app already uses (`useAuth()`), just backed by the store — a session
 * restore + role check `isAuthenticated` and login/verifyOtp/resendOtp/logout
 * that unwrap the thunks into the same { success, error? } shape callers
 * already expect.
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, accessToken, isLoading, isBootstrapping } = useAppSelector((state) => state.auth);
  export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => {
      const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (stored && !isTokenExpired(stored)) {
        return stored;
      }
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    });

    const [user, setUser] = useState<User | null>(() => {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedToken && storedUser && !isTokenExpired(storedToken)) {
        try {
          const parsed = JSON.parse(storedUser);
          if (!parsed.role && storedToken) {
            const payload = decodeTokenPayload(storedToken);
            const jwtUser = (payload?.user as any) || {};
            parsed.role = (jwtUser.role || jwtUser.roleName || "TRAINER").toUpperCase();
          }
          return parsed;
        } catch {
          return null;
        }
      }
      return null;
    });

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Proactively refreshes the access token shortly before it expires, so an
    // active user is never interrupted by a hard timeout. Falls back to
    // logout only if the refresh itself fails (revoked/expired session).
    useEffect(() => {
      if (!accessToken) return;

      const msUntilExpiry = getMsUntilExpiry(accessToken);
      if (msUntilExpiry === null) return;

      const delay = Math.max(msUntilExpiry - REFRESH_BEFORE_EXPIRY_MS, 1000);
      refreshTimerRef.current = setTimeout(() => {
        dispatch(restoreSessionThunk());
      }, delay);

      return () => {
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      };
    }, [accessToken, dispatch]);

    const isAuthenticated = Boolean(accessToken && user?.role?.toUpperCase() === "TRAINER");

    const login = async (email: string, password: string): Promise<LoginResult> => {
      const result = await dispatch(loginThunk({ email, password }));
      if (loginThunk.rejected.match(result)) {
        return { success: false, error: result.payload ?? "Invalid email or username or password." };
      }
      if (result.payload.requiresOtp) {
        return { success: true, requiresOtp: true, verificationId: result.payload.verificationId };
      }
      return { success: true, requiresOtp: false };
    };

    const verifyOtp = async (verificationId: string, otp: string): Promise<{ success: boolean; error?: string }> => {
      const result = await dispatch(verifyOtpThunk({ verificationId, otp }));
      if (verifyOtpThunk.rejected.match(result)) {
        return { success: false, error: result.payload ?? "Invalid OTP. Please try again." };
      }
      return { success: true };
    };

    const resendOtp = async (verificationId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      const result = await dispatch(resendOtpThunk(verificationId));
      if (resendOtpThunk.rejected.match(result)) {
        return { success: false, error: result.payload ?? "Could not resend OTP. Please try again." };
      }
      return { success: true, message: result.payload.message };
    };

    const logout = async () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      await dispatch(logoutThunk());
    };

    return {
      user,
      token: accessToken,
      isAuthenticated,
      isLoading,
      isBootstrapping,
      login,
      verifyOtp,
      resendOtp,
      logout,
    };
  }
