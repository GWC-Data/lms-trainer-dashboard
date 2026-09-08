import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Users,
  ClipboardCheck,
  UserCheck,
  ArrowUpRight,
  MapPin,
  Laptop,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import {
  getTrainerDashboardApi,
  TrainerDashboardData,
  DashboardScheduleItem,
} from "@/services/api";

export default function Dashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<TrainerDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
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
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const trainerFirstName =
    user?.firstName || (user?.email ? user.email.split("@")[0] : "Trainer");

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";

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

  const summary = dashboardData?.summary || {
    assignedCourses: 0,
    onlineBatches: 0,
    offlineBatches: 0,
    totalTrainees: 0,
    atRiskTrainees: 0,
    pendingEvaluations: 0,
    averageAttendance: 0,
  };

  const courses = dashboardData?.courses || [];
  const upcomingSchedule = dashboardData?.upcomingSchedule || [];
  const traineesNeedingSupport = dashboardData?.traineesNeedingSupport || [];

  const stats = [
    {
      label: "Assigned Courses",
      value: summary.assignedCourses,
      icon: BookOpen,
      chip: "bg-[#FBECE7] text-[#DE896A]",
    },
    {
      label: "Total Trainees",
      value: summary.totalTrainees,
      icon: Users,
      chip: "bg-sky-50 text-sky-700",
    },
    {
      label: "Pending Evaluations",
      value: summary.pendingEvaluations,
      icon: ClipboardCheck,
      chip: "bg-violet-50 text-violet-700",
    },
    {
      label: "Avg. Attendance",
      value: `${summary.averageAttendance}%`,
      icon: UserCheck,
      chip: "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Greeting */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-[#3A2A22]">
          {greeting}, {trainerFirstName}
        </h1>
        <p className="text-sm text-[#8C7A70]">
          Here's what's happening across your assigned courses today.
        </p>
      </div>

      {/* Error alert banner with retry */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDashboard}
            className="flex items-center gap-1.5 text-xs text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-start justify-between p-5 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-3 w-20 rounded bg-[#F5E2DA]" />
                    <div className="h-6 w-12 rounded bg-[#E9D6CC]" />
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-[#F5E2DA]" />
                </CardContent>
              </Card>
            ))
          : stats.map((s) => (
              <Card key={s.label}>
                <CardContent className="flex items-start justify-between p-5">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-[#B7A79D]">
                      {s.label}
                    </p>
                    <p className="mt-1 text-xl font-bold text-[#3A2A22]">{s.value}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.chip}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* My Courses pillar */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Courses</CardTitle>
              <p className="mt-1 text-sm text-[#8C7A70]">
                Assigned courses across both delivery modes
              </p>
            </div>
            <Link to="/courses">
              <Button variant="ghost" size="sm">
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 rounded-xl border border-[#F5E2DA] p-4 animate-pulse"
                >
                  <div className="space-y-2">
                    <div className="h-4 w-48 rounded bg-[#E9D6CC]" />
                    <div className="h-3 w-32 rounded bg-[#F5E2DA]" />
                    <div className="h-2 w-40 rounded bg-[#F5E2DA]" />
                  </div>
                </div>
              ))
            ) : courses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#F5E2DA] p-8 text-center text-sm text-[#8C7A70]">
                No assigned courses found.
              </div>
            ) : (
              courses.map((c) => {
                const modes = getModes(c.deliveryMode);
                return (
                  <div
                    key={c.id}
                    className="flex flex-col gap-3 rounded-xl border border-[#F5E2DA] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#3A2A22]">
                            {c.name}
                          </p>
                          {modes.map((mode) => (
                            <Badge
                              key={mode}
                              tone={mode.toLowerCase() === "online" ? "blue" : "amber"}
                            >
                              {mode.toLowerCase() === "online" ? (
                                <Laptop className="h-3 w-3" />
                              ) : (
                                <MapPin className="h-3 w-3" />
                              )}
                              {mode}
                            </Badge>
                          ))}
                          <Badge tone="neutral">
                            {c.batches} batch{c.batches === 1 ? "" : "es"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-[#B7A79D]">
                          {c.trainees} trainees · {c.domains} domains · {c.hours} hrs
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <ProgressBar value={c.avgProgress} className="max-w-[220px]" />
                          <span className="text-xs font-medium text-[#8C7A70]">
                            {c.avgProgress}% avg
                            {c.batches > 1 ? ` across ${c.batches} batches` : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#8C7A70] sm:flex-col sm:items-end sm:gap-0.5">
                      <Clock className="h-3.5 w-3.5 sm:hidden" />
                      <span>{c.nextSession || "No upcoming session"}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Schedule / Trainees pillar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Schedule</CardTitle>
              {upcomingSchedule.length > 0 && upcomingSchedule[0].batchCode && (
                <p className="mt-1 text-xs text-[#B7A79D]">
                  Batch {upcomingSchedule[0].batchCode}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#F5E2DA]" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3 w-28 rounded bg-[#E9D6CC]" />
                      <div className="h-4 w-40 rounded bg-[#F5E2DA]" />
                      <div className="h-3 w-32 rounded bg-[#F5E2DA]" />
                    </div>
                  </div>
                ))
              ) : upcomingSchedule.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#8C7A70]">
                  No upcoming sessions scheduled.
                </p>
              ) : (
                upcomingSchedule.map((item) => {
                  const isPast = isPastSession(item);
                  return (
                    <div key={item.id} className="flex gap-3">
                      <div
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          isPast
                            ? "bg-emerald-500"
                            : item.isToday
                            ? "bg-[#DE896A]"
                            : "bg-[#E9D6CC]"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="flex items-center text-xs font-semibold uppercase tracking-wide text-[#B7A79D]">
                          {item.date} · {item.time}
                          {isPast && (
                            <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] text-emerald-600">
                              Completed
                            </span>
                          )}
                        </p>
                        <p
                          className={`truncate text-[13px] font-medium text-[#3A2A22] ${
                            isPast ? "opacity-50 line-through" : ""
                          }`}
                        >
                          {item.title}
                        </p>
                        <p
                          className={`truncate text-xs text-[#8C7A70] ${
                            isPast ? "opacity-50" : ""
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trainees Needing Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between animate-pulse">
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-28 rounded bg-[#E9D6CC]" />
                      <div className="h-3 w-20 rounded bg-[#F5E2DA]" />
                    </div>
                    <div className="h-5 w-12 rounded bg-[#F5E2DA]" />
                  </div>
                ))
              ) : traineesNeedingSupport.length === 0 ? (
                <p className="py-4 text-center text-xs text-[#8C7A70]">
                  No trainees currently flagged at-risk.
                </p>
              ) : (
                traineesNeedingSupport.slice(0, 4).map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#3A2A22]">{t.name}</p>
                      <p className="flex items-center gap-1.5 text-xs text-[#B7A79D]">
                        {t.courseName || t.reason}
                        {t.batchName && (
                          <>
                            <span>· {t.batchName}</span>
                            {t.batchMode && (
                              <Badge
                                tone={
                                  t.batchMode.toLowerCase() === "online" ? "blue" : "amber"
                                }
                                className="scale-75 origin-left px-1.5 py-0"
                              >
                                {t.batchMode}
                              </Badge>
                            )}
                          </>
                        )}
                      </p>
                    </div>
                    <Badge tone="red">at risk</Badge>
                  </div>
                ))
              )}
              <Link to="/trainees">
                <Button variant="subtle" size="sm" className="mt-1 w-full justify-center">
                  View all trainees
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
