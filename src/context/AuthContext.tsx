import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  loginApi,
  verifyOtpApi,
  resendOtpApi,
  logoutApi,
  refreshTokenApi,
  TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
  type BackendUser,
} from "@/services/api";
import { AxiosError } from "axios";

export interface User extends BackendUser {}

export interface LoginResult {
  success: boolean;
  error?: string;
  requiresOtp?: boolean;
  verificationId?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyOtp: (verificationId: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  resendOtp: (verificationId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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

function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const payload = decodeTokenPayload(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
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
        return JSON.parse(storedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = async () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    // Best-effort: a failed logout call must never trap the user in a
    // logged-in-looking state client-side — storage is cleared regardless.
    try {
      await logoutApi();
    } catch {
      // ignore
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  // Proactively refreshes the access token shortly before it expires, so an
  // active user is never interrupted by a hard timeout. Falls back to
  // logout only if the refresh itself fails (revoked/expired session).
  useEffect(() => {
    if (!token) return;

    const msUntilExpiry = getMsUntilExpiry(token);
    if (msUntilExpiry === null) return;

    const delay = Math.max(msUntilExpiry - REFRESH_BEFORE_EXPIRY_MS, 1000);
    refreshTimerRef.current = setTimeout(async () => {
      const newAccessToken = await refreshTokenApi();
      if (newAccessToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, newAccessToken);
        setToken(newAccessToken);
      } else {
        logout();
      }
    }, delay);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // The backend already returns a user-facing `message` for every login/OTP
  // failure branch (invalid creds, account not activated, rate-limited,
  // invalid/expired/max-attempts OTP, device limit, resend cooldown, ...) —
  // so this just surfaces that message, with a network/fallback case.
  function mapAuthError(err: unknown, fallbackMessage: string): string {
    if (err instanceof AxiosError) {
      const data = err.response?.data as { message?: string; error?: string } | undefined;
      if (data?.message) return data.message;
      if (data?.error) return data.error;
      if (err.code === "ERR_NETWORK") {
        return "Unable to connect to LMS backend server. Please check your connection.";
      }
    }
    return fallbackMessage;
  }

  // Shared by the "already verified today" branch of login() and
  // verifyOtp() — both receive the same { accessToken, refreshToken, user }
  // shape once tokens actually exist, they just get there via different requests.
  function storeAuthenticatedSession(auth: {
    accessToken: string;
    refreshToken: string;
    user: BackendUser;
  }): { success: boolean; error?: string } {
    const roleName = auth.user.role?.toUpperCase() || "";
    if (roleName !== "TRAINER") {
      return {
        success: false,
        error: "Access denied. Only trainer accounts can access this dashboard.",
      };
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, auth.accessToken);
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, auth.refreshToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(auth.user));

    setToken(auth.accessToken);
    setUser(auth.user);
    return { success: true };
  }

  const login = async (email: string, password: string): Promise<LoginResult> => {
    setIsLoading(true);
    try {
      const response = await loginApi(email, password);

      if (!response.requiresOtp) {
        // This device already verified OTP today — tokens already issued,
        // no OTP screen needed.
        return storeAuthenticatedSession(response);
      }

      return {
        success: true,
        requiresOtp: true,
        verificationId: response.verificationId,
      };
    } catch (err: unknown) {
      return { success: false, error: mapAuthError(err, "Invalid email or username or password.") };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (verificationId: string, otp: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await verifyOtpApi(verificationId, otp);
      return storeAuthenticatedSession(response);
    } catch (err: unknown) {
      return { success: false, error: mapAuthError(err, "Invalid OTP. Please try again.") };
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (verificationId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const response = await resendOtpApi(verificationId);
      return { success: true, message: response.message };
    } catch (err: unknown) {
      return { success: false, error: mapAuthError(err, "Could not resend OTP. Please try again.") };
    }
  };

  const isAuthenticated = useMemo(() => {
    return Boolean(token && !isTokenExpired(token) && user?.role?.toUpperCase() === "TRAINER");
  }, [token, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated,
      isLoading,
      login,
      verifyOtp,
      resendOtp,
      logout,
    }),
    [user, token, isAuthenticated, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
