import { useEffect, useRef } from "react";
import type { BackendUser } from "@/services/api";
import { decodeJwtPayload } from "@/lib/jwt";
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

// Milliseconds until the token's exp claim, or null if it can't be read.
function getMsUntilExpiry(token: string): number | null {
  const payload = decodeJwtPayload(token);
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

  const role = user?.role?.toUpperCase();
  const isAuthenticated = Boolean(accessToken && (role === "TRAINER" || role === "ADMIN"));

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
