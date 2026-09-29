import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
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

  const inFlightRef = useRef<Promise<void> | null>(null);
  const dashboardDataRef = useRef<TrainerDashboardData | null>(dashboardData);
  dashboardDataRef.current = dashboardData;

  const fetchDashboard = useCallback(async (force = false) => {
    if (!isAuthenticated) return;
    // Don't refetch if we already have dashboard data, unless explicitly forced
    if (dashboardDataRef.current && !force) return;
    if (inFlightRef.current) return inFlightRef.current;

    const promise = (async () => {
      try {
        // Only show full loading spinner if there is no data yet
        if (!dashboardDataRef.current) {
          setLoading(true);
        }
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
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = promise;
    return promise;
  }, [isAuthenticated]);

  const refreshDashboard = useCallback(async () => {
    return fetchDashboard(true);
  }, [fetchDashboard]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      fetchDashboard(false);
    }
  }, [fetchDashboard]);

  // Listen for schedule/calendar changes to automatically invalidate and refetch dashboard data
  useEffect(() => {
    const handleScheduleUpdate = () => {
      if (typeof window !== "undefined" && window.location.pathname === "/") {
        fetchDashboard(true);
      }
    };

    window.addEventListener("lms:schedule-updated", handleScheduleUpdate);
    return () => {
      window.removeEventListener("lms:schedule-updated", handleScheduleUpdate);
    };
  }, [fetchDashboard]);

  const traineesNeedingSupport = dashboardData?.traineesNeedingSupport || [];
  const atRiskCount = traineesNeedingSupport.length;

  return (
    <TrainerDashboardContext.Provider
      value={{
        dashboardData,
        loading,
        error,
        refreshDashboard,
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
