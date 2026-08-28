import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { trainer } from "@/data/mockData";

// Demo-only credentials — this app has no real backend. Shown to the user
// on the login screen as a hint so the demo is self-explanatory.
export const DEMO_CREDENTIALS = {
  email: trainer.email,
  password: "TeqCertify@2026",
};

const STORAGE_KEY = "teqcertify_auth";

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === "true"
  );

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem(STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [isAuthenticated]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      login: async (email: string, password: string) => {
        // Simulate a network round-trip so the form's loading state is real.
        await new Promise((resolve) => setTimeout(resolve, 600));

        const emailMatches = email.trim().toLowerCase() === DEMO_CREDENTIALS.email.toLowerCase();
        const passwordMatches = password === DEMO_CREDENTIALS.password;

        if (!emailMatches || !passwordMatches) {
          return { success: false, error: "Invalid email or password." };
        }

        setIsAuthenticated(true);
        return { success: true };
      },
      logout: () => setIsAuthenticated(false),
    }),
    [isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
