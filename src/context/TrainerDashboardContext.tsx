import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import {
  getTrainerDashboardApi,
  TrainerDashboardData,
  DashboardTraineeSupport,
} from "@/services/api";
import { useAuth } from "./AuthContext";

interface TrainerDashboardContextValue {
  dashboardData: TrainerDashboardData | null;
  loading: boolean;
  error: string | null;
  refreshDashboard: () => Promise<void>;
  atRiskCount: number;
  traineesNeedingSupport: DashboardTraineeSupport[];
}

const TrainerDashboardContext = createContext<TrainerDashboardContextValue | null>(null);

export function TrainerDashboardProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [dashboardData, setDashboardData] = useState<TrainerDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getTrainerDashboardApi();
      
      if (res && res.success && res.data) {
        setDashboardData(res.data);
      } else {
        setError(res?.message || "Failed to load dashboard data");
      }
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Unable to load trainer dashboard. Please check your network connection."
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const traineesNeedingSupport = dashboardData?.traineesNeedingSupport || [];
  const atRiskCount = traineesNeedingSupport.length;

  return (
    <TrainerDashboardContext.Provider
      value={{
        dashboardData,
        loading,
        error,
        refreshDashboard: fetchDashboard,
        atRiskCount,
        traineesNeedingSupport,
      }}
    >
      {children}
    </TrainerDashboardContext.Provider>
  );
}

export function useTrainerDashboard() {
  const context = useContext(TrainerDashboardContext);
  if (!context) {
    throw new Error("useTrainerDashboard must be used within a TrainerDashboardProvider");
  }
  return context;
}
