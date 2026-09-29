import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Layers, Users, Clock, AlertCircle, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";
import PageLoader from "@/components/ui/PageLoader";
import { useAuth } from "@/context/AuthContext";
import { useTrainerDashboard } from "@/context/TrainerDashboardContext";
import { DashboardScheduleItem, DashboardTraineeSupport } from "@/services/api";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatCard from "@/components/dashboard/StatCard";
import CourseCard from "@/components/dashboard/CourseCard";
import ScheduleCard from "@/components/dashboard/ScheduleCard";
import MyAttendanceCard from "@/components/dashboard/MyAttendanceCard";
import LearningOverviewCard from "@/components/dashboard/LearningOverviewCard";
import SupportTraineeCard from "@/components/dashboard/SupportTraineeCard";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dashboardData, loading, error, refreshDashboard } = useTrainerDashboard();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!dashboardData) {
      refreshDashboard();
    }
  }, [dashboardData, refreshDashboard]);


  const trainerFirstName =
    user?.firstName || (user?.email ? user.email.split("@")[0] : "Trainer");

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  async function handleRefresh() {
    try {
      setIsRefreshing(true);
      await refreshDashboard();
    } finally {
      setIsRefreshing(false);
    }
  }

  function isPastSession(item: DashboardScheduleItem) {
    if (item.isPast) return true;
    if (!item.isToday) return false;
    const match = item.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return false;
    let sessionHour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();

    if (ampm === "PM" && sessionHour < 12) sessionHour += 12;
    if (ampm === "AM" && sessionHour === 12) sessionHour = 0;

    const now = new Date();
    if (now.getHours() > sessionHour) return true;
    if (now.getHours() === sessionHour && now.getMinutes() >= minute) return true;
    return false;
  }

  const getModes = (deliveryMode: string) => {
    if (!deliveryMode) return [];
    const lower = deliveryMode.toLowerCase().trim();
    if (lower === "both") return ["online", "offline"];
    return [lower];
  };

  const handleTraineeClick = (trainee: DashboardTraineeSupport) => {
    const query = trainee.batchId ? `?batchId=${encodeURIComponent(trainee.batchId)}` : "";
    if (typeof window !== "undefined" && trainee.name) {
      sessionStorage.setItem(`trainee_name_${trainee.id}`, trainee.name);
    }
    navigate(`/trainees/${trainee.id}${query}`, { state: { traineeName: trainee.name } });
  };

  if (loading && !dashboardData) {
    return <PageLoader />;
  }

  const summary = dashboardData?.summary || {
    assignedCourses: 0,
    activeBatches: 0,
    totalTrainees: 0,
    upcomingClasses: 0,
    onlineBatches: 0,
    offlineBatches: 0,
    atRiskTrainees: 0,
    pendingEvaluations: 0,
    averageAttendance: 0,
  };

  const courses = dashboardData?.courses || [];
  const upcomingSchedule = dashboardData?.upcomingSchedule || [];
  const traineesNeedingSupport = dashboardData?.traineesNeedingSupport || [];

  // Calculate overall average course progress
  const overallAvgProgress =
    courses.length > 0
      ? Math.round(
          courses.reduce((acc, c) => acc + (c.avgProgress || 0), 0) / courses.length
        )
      : 0;

  const stats = [
    {
      label: "Assigned Courses",
      value: summary.assignedCourses,
      icon: BookOpen,
      chipBg: "bg-[#FBECE7] text-[#DE896A]",
    },
    {
      label: "Active Batches",
      value: summary.activeBatches,
      icon: Layers,
      chipBg: "bg-purple-50 text-purple-600",
    },
    {
      label: "Total Trainees",
      value: summary.totalTrainees,
      icon: Users,
      chipBg: "bg-sky-50 text-sky-600",
    },
    {
      label: "Upcoming Classes",
      value: summary.upcomingClasses,
      icon: Clock,
      chipBg: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="w-full min-w-0 space-y-3 sm:space-y-4 max-w-[1536px] mx-auto pb-8">
      {/* ── Top Greeting Hero ────────────────────────────────────────────── */}
      <DashboardHeader
        greeting={greeting}
        trainerFirstName={trainerFirstName}
        todayFormatted={todayFormatted}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* ── Error Banner ─────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span className="text-xs sm:text-sm">{error}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshDashboard()}
            className="flex items-center gap-1.5 text-xs text-red-700 hover:bg-red-100 font-semibold h-7.5 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      )}

      {/* ── Row 1: KPI Cards (1 col on mobile, 2 on tablet, 4 on desktop & scaling) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4 w-full min-w-0">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            chipBg={s.chipBg}
          />
        ))}
      </div>

      {/* ── Row 2: Courses & Upcoming Schedule (Balanced Operations Overview) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 lg:gap-4.5 items-stretch w-full min-w-0">
        <div className="lg:col-span-7 xl:col-span-8 min-w-0 flex flex-col">
          <CourseCard courses={courses} getModes={getModes} className="h-full" />
        </div>
        <div className="lg:col-span-5 xl:col-span-4 min-w-0 flex flex-col">
          <ScheduleCard
            upcomingSchedule={upcomingSchedule}
            isPastSession={isPastSession}
            className="h-full"
          />
        </div>
      </div>

      {/* ── Row 3: My Attendance, Learning Overview & Trainees Needing Support ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 min-[1200px]:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-4.5 items-stretch w-full min-w-0">
        <div className="min-w-0 flex flex-col">
          <MyAttendanceCard summary={summary} className="h-full" />
        </div>
        <div className="min-w-0 flex flex-col">
          <LearningOverviewCard overallAvgProgress={overallAvgProgress} className="h-full" />
        </div>
        <div className="min-w-0 flex flex-col md:col-span-2 min-[1200px]:col-span-1">
          <SupportTraineeCard
            traineesNeedingSupport={traineesNeedingSupport}
            onTraineeClick={handleTraineeClick}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}
