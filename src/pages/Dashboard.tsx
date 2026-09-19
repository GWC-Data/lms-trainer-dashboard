import { useNavigate, Link } from "react-router-dom";
import {
  BookOpen,
  Users,
  Layers,
  Clock,
  ArrowUpRight,
  MapPin,
  Laptop,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar, getInitials } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import PageLoader from "@/components/ui/PageLoader";
import { useAuth } from "@/context/AuthContext";
import { useTrainerDashboard } from "@/context/TrainerDashboardContext";
import { DashboardScheduleItem, DashboardTraineeSupport } from "@/services/api";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dashboardData, loading, error, refreshDashboard } = useTrainerDashboard();

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

  const handleTraineeClick = (trainee: DashboardTraineeSupport) => {
    navigate("/trainees", {
      state: {
        traineeId: trainee.id,
        search: trainee.name,
        batchId: trainee.batchId,
        riskOnly: true,
      },
    });
  };

  if (loading && !dashboardData) {
    return <PageLoader text="Loading..." />;
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

  const stats = [
    {
      label: "Assigned Courses",
      value: summary.assignedCourses,
      icon: BookOpen,
      chip: "bg-[#FBECE7] text-[#DE896A]",
    },
    {
      label: "Active Batches",
      value: summary.activeBatches,
      icon: Layers,
      chip: "bg-violet-50 text-violet-700",
    },
    {
      label: "Total Trainees",
      value: summary.totalTrainees,
      icon: Users,
      chip: "bg-sky-50 text-sky-700",
    },
    {
      label: "Upcoming Classes",
      value: summary.upcomingClasses,
      icon: Clock,
      chip: "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Header Greeting */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#3A2A22]">
          {greeting}, {trainerFirstName}
        </h1>
        <p className="text-xs sm:text-sm text-[#8C7A70]">
          Here's what's happening across your assigned courses today.
        </p>
      </div>

      {/* Error alert banner with retry */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshDashboard()}
            className="flex items-center gap-1.5 text-xs text-red-700 hover:bg-red-100 font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* KPI Cards: 4 in a row desktop, 2x2 tablet, 1-col / compact mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {stats.map((s) => (
          <Card key={s.label} className="border-[#F5E2DA] bg-white transition-all hover:shadow-sm">
            <CardContent className="flex items-start justify-between p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#B7A79D]">
                  {s.label}
                </p>
                <p className="mt-1 text-2xl sm:text-3xl font-bold text-[#3A2A22] tracking-tight">
                  {s.value}
                </p>
              </div>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.chip}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area: 2-Column Desktop (Courses larger), Stacked Tablet/Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Courses (Larger width) */}
        <Card className="lg:col-span-7 xl:col-span-8 border-[#F5E2DA] bg-white shadow-sm shadow-black/[0.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#F8EFEA] px-5 sm:px-6 pt-5 sm:pt-6">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-[#3A2A22]">Courses</CardTitle>
              <p className="mt-0.5 text-xs text-[#8C7A70]">
                Assigned courses across both delivery modes
              </p>
            </div>
            <Link to="/courses">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-[#DE896A] hover:bg-[#FBECE7] hover:text-[#C26D4D] gap-1 px-2.5 h-8"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3.5 p-5 sm:p-6">
            {courses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#F5E2DA] p-8 text-center text-sm text-[#8C7A70]">
                No assigned courses found.
              </div>
            ) : (
              courses.map((c) => {
                const modes = getModes(c.deliveryMode);
                return (
                  <div
                    key={c.id}
                    className="flex flex-col gap-3 rounded-xl border border-[#F5E2DA] bg-[#FFFBF9] p-4 transition-all hover:border-[#DE896A]/40 hover:bg-white hover:shadow-xs sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-[#3A2A22] truncate max-w-full" title={c.name}>
                            {c.name}
                          </p>
                          {modes.map((mode) => (
                            <Badge
                              key={mode}
                              tone={mode.toLowerCase() === "online" ? "blue" : "amber"}
                              className="text-[10px] px-2 py-0.5"
                            >
                              {mode.toLowerCase() === "online" ? (
                                <Laptop className="h-3 w-3 mr-1" />
                              ) : (
                                <MapPin className="h-3 w-3 mr-1" />
                              )}
                              {mode}
                            </Badge>
                          ))}
                          <Badge tone="neutral" className="text-[10px] px-2 py-0.5">
                            {c.batches} batch{c.batches === 1 ? "" : "es"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-[#8C7A70]">
                          {c.trainees} trainees · {c.domains} domains · {c.hours} hrs
                        </p>
                        <div className="mt-2.5 flex items-center gap-3">
                          <ProgressBar value={c.avgProgress} className="max-w-[180px] sm:max-w-[220px]" />
                          <span className="text-xs font-semibold text-[#8C7A70]">
                            {c.avgProgress}% avg
                            {c.batches > 1 ? ` across ${c.batches} batches` : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#8C7A70] sm:flex-col sm:items-end sm:gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F5E2DA]/60">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-[#7C695E]">
                        <Clock className="h-3.5 w-3.5 text-[#DE896A]" />
                        <span>Next session</span>
                      </div>
                      <span className="font-semibold text-[#3A2A22] text-xs">
                        {c.nextSession || "No upcoming session"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right Column: Upcoming Schedule + Trainees Needing Support */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
          {/* Upcoming Schedule Card */}
          <Card className="border-[#F5E2DA] bg-white shadow-sm shadow-black/[0.02]">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#F8EFEA] px-4 sm:px-5 pt-4">
              <div>
                <CardTitle className="text-base font-bold text-[#3A2A22]">Upcoming Schedule</CardTitle>
                <p className="mt-0.5 text-xs text-[#8C7A70]">Your upcoming scheduled classes</p>
              </div>
              {upcomingSchedule.length > 0 && upcomingSchedule[0].batchCode && (
                <Badge tone="neutral" className="text-[10px] font-medium">
                  Batch {upcomingSchedule[0].batchCode}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3 p-4 sm:p-5 pt-3.5">
              {upcomingSchedule.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#8C7A70]">
                  No upcoming sessions scheduled.
                </p>
              ) : (
                upcomingSchedule.map((item) => {
                  const isPast = isPastSession(item);
                  return (
                    <div key={item.id} className="flex gap-3.5 items-start">
                      <div
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                          isPast
                            ? "bg-emerald-500 ring-4 ring-emerald-50"
                            : item.isToday
                            ? "bg-[#DE896A] ring-4 ring-[#DE896A]/20"
                            : "bg-[#D8C7BE]"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#B7A79D]">
                            {item.date} · {item.time}
                          </p>
                          {isPast && (
                            <Badge tone="green" className="text-[9px] px-1.5 py-0">
                              Completed
                            </Badge>
                          )}
                          {item.batch && (
                            <span className="text-[11px] font-semibold text-[#8C7A70]">
                              ({item.batch})
                            </span>
                          )}
                        </div>
                        <p
                          className={`mt-0.5 text-xs sm:text-sm font-semibold text-[#3A2A22] truncate ${
                            isPast ? "opacity-60 line-through" : ""
                          }`}
                          title={item.title}
                        >
                          {item.title}
                        </p>
                        {item.description && (
                          <p
                            className={`text-xs text-[#8C7A70] line-clamp-2 mt-0.5 ${
                              isPast ? "opacity-60" : ""
                            }`}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Trainees Needing Support (At Risk) Card */}
          <Card className="border-[#F5E2DA] bg-white shadow-sm shadow-black/[0.02]">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#F8EFEA] px-4 sm:px-5 pt-4">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-[#3A2A22]">
                  Trainees Needing Support
                </CardTitle>
                <p className="mt-0.5 text-xs text-[#8C7A70]">
                  Flagged for low attendance or test performance
                </p>
              </div>
              {traineesNeedingSupport.length > 0 && (
                <Badge tone="red" className="text-[10px] px-2 py-0.5 font-bold shrink-0">
                  {traineesNeedingSupport.length}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-3.5 sm:p-4 pt-3 space-y-2">
              {traineesNeedingSupport.length === 0 ? (
                <div className="py-5 text-center text-xs text-[#8C7A70]">
                  <p className="font-medium">No trainees currently flagged at-risk.</p>
                  <p className="text-[11px] text-[#B7A79D] mt-0.5">All active trainees are performing well.</p>
                </div>
              ) : (
                traineesNeedingSupport.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleTraineeClick(t)}
                    className="group flex items-start gap-2.5 sm:gap-3 rounded-xl border border-[#F5E2DA] bg-[#FFFBF9] p-2.5 sm:p-3 transition-all hover:border-[#DE896A]/40 hover:bg-white hover:shadow-xs cursor-pointer"
                  >
                    <Avatar
                      initials={getInitials(t.name)}
                      className="h-8 w-8 shrink-0 text-xs font-semibold mt-0.5"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                        <p className="text-xs sm:text-sm font-bold text-[#3A2A22] truncate group-hover:text-[#DE896A] transition-colors">
                          {t.name}
                        </p>
                        <Badge
                          tone="red"
                          className="text-[9px] sm:text-[10px] px-1.5 py-0.5 font-bold tracking-wider shrink-0"
                        >
                          AT RISK
                        </Badge>
                      </div>

                      {t.courseName && (
                        <p className="text-xs text-[#6B5A52] truncate font-medium" title={t.courseName}>
                          {t.courseName}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 text-[11px] text-[#8C7A70] flex-wrap">
                        {t.batchName && (
                          <span className="font-medium text-[#7C695E] truncate">{t.batchName}</span>
                        )}
                        {t.batchName && t.batchMode && (
                          <span className="text-[#D8C7BE]">·</span>
                        )}
                        {t.batchMode && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8C7A70]">
                            {t.batchMode}
                          </span>
                        )}
                      </div>

                      {t.reason && (
                        <p className="text-[11px] text-[#A65B42] font-medium truncate" title={t.reason}>
                          {t.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* View all trainees button - full width secondary action */}
              <Link to="/trainees" className="block pt-1">
                <Button
                  variant="subtle"
                  size="sm"
                  className="w-full justify-center text-xs font-semibold py-2 rounded-xl border border-[#F0DED4] bg-white text-[#7C695E] hover:bg-[#FBECE7] hover:text-[#DE896A] hover:border-[#DE896A]/40 transition-colors shadow-none h-8.5"
                >
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
