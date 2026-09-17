import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  loginApi,
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
  type BackendUser,
} from "@/services/api";
import { AxiosError } from "axios";

export interface User extends BackendUser {}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
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
    if (payload && typeof payload.exp === "number") {
      return Date.now() >= payload.exp * 1000;
    }
    return false;
  } catch {
    return true;
  }
}

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

  // Periodically check token validity
  useEffect(() => {
    if (!token) return;
    const checkExpiry = () => {
      if (isTokenExpired(token)) {
        logout();
      }
    };
    const interval = setInterval(checkExpiry, 60000);
    return () => clearInterval(interval);
  }, [token]);

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await loginApi(email, password);
      const { accessToken, user: backendUser } = response.login;

      // Validate that the user has the TRAINER role
      const roleName = backendUser.role?.toUpperCase() || "";
      if (roleName !== "TRAINER") {
        return {
          success: false,
          error: "Access denied. Only trainer accounts can access this dashboard.",
        };
      }

      // Store in localStorage
      localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(backendUser));

      setToken(accessToken);
      setUser(backendUser);
      return { success: true };
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 401) {
          return { success: false, error: "Invalid email or password." };
        }
        if (err.response?.status === 403) {
          const msg = (err.response.data as { message?: string })?.message;
          return {
            success: false,
            error: msg || "Account not yet activated. Please check your email for the setup link.",
          };
        }
        if (err.response?.status === 429) {
          const msg = (err.response.data as { message?: string })?.message;
          return {
            success: false,
            error: msg || "Too many failed login attempts. Please try again later.",
          };
        }
        if (err.response?.data && typeof err.response.data === "object") {
          const data = err.response.data as { message?: string; error?: string };
          if (data.message) return { success: false, error: data.message };
          if (data.error) return { success: false, error: data.error };
        }
        if (err.code === "ERR_NETWORK") {
          return {
            success: false,
            error: "Unable to connect to LMS backend server. Please check your connection.",
          };
        }
      }
      return { success: false, error: "An unexpected error occurred. Please try again." };
    } finally {
      setIsLoading(false);
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
