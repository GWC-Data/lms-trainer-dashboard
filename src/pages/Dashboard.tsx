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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import {
  courses,
  trainees,
  assignments,
  trainer,
  batchesForCourse,
  totalTraineesForCourse,
  avgProgressForCourse,
  nextSessionForCourse,
  offlineBatches,
  attendanceForBatch,
  scheduleForBatch,
  batchById,
  courseById,
} from "@/data/mockData";

const activeOfflineBatches = offlineBatches();
const attendanceRates = activeOfflineBatches
  .map((b) => {
    const roster = attendanceForBatch(b.id);
    if (roster.length === 0) return null;
    return (roster.filter((r) => r.status === "P").length / roster.length) * 100;
  })
  .filter((rate): rate is number => rate !== null);
const avgAttendanceRate = attendanceRates.length
  ? Math.round(attendanceRates.reduce((sum, r) => sum + r, 0) / attendanceRates.length)
  : 0;
const primaryOfflineBatch = activeOfflineBatches[0];

const stats = [
  {
    label: "Assigned Courses",
    value: courses.length,
    icon: BookOpen,
    hint: `${courses.filter((c) => c.mode === "online").length} online · ${courses.filter((c) => c.mode === "offline").length} offline`,
  },
  {
    label: "Total Trainees",
    value: trainees.length,
    icon: Users,
    hint: `${trainees.filter((t) => t.atRisk).length} flagged at-risk`,
  },
  {
    label: "Pending Evaluations",
    value: assignments.reduce((sum, a) => sum + a.pendingReview, 0),
    icon: ClipboardCheck,
    hint: "Assignments awaiting review",
  },
  {
    label: "Avg. Attendance",
    value: `${avgAttendanceRate}%`,
    icon: UserCheck,
    hint: `Across ${activeOfflineBatches.length} offline batch${activeOfflineBatches.length === 1 ? "" : "es"}`,
  },
];

export default function Dashboard() {
  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-[#3A2A22]">{greeting}, {trainer.name.split(" ")[0]}</h1>
        <p className="text-sm text-[#8C7A70]">
          Here's what's happening across your assigned courses today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-start justify-between p-5">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-[#B7A79D]">{s.label}</p>
                <p className="mt-1 text-xl font-bold text-[#3A2A22]">{s.value}</p>
                <p className="mt-1 text-xs text-[#B7A79D]">{s.hint}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A]">
                <s.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* My Courses pillar */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Courses</CardTitle>
              <p className="mt-1 text-sm text-[#8C7A70]">Assigned courses across both delivery modes</p>
            </div>
            <Link to="/courses">
              <Button variant="ghost" size="sm">
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {courses.map((c) => {
              const courseBatches = batchesForCourse(c.id);
              const avgProgress = avgProgressForCourse(c.id);
              return (
                <div
                  key={c.id}
                  className="flex flex-col gap-3 rounded-xl border border-[#F5E2DA] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FFFBF9] p-1">
                      <img src={c.image} alt="" className="h-full w-full object-contain" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[#3A2A22]">
                          {c.name} <span className="font-normal text-[#B7A79D]">— {c.level}</span>
                        </p>
                        <Badge tone={c.mode === "online" ? "blue" : "amber"}>
                          {c.mode === "online" ? <Laptop className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                          {c.mode}
                        </Badge>
                        <Badge tone="neutral">
                          {courseBatches.length} batch{courseBatches.length === 1 ? "" : "es"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-[#B7A79D]">
                        {totalTraineesForCourse(c.id)} trainees · {c.domains} domains · {c.hours} hrs
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <ProgressBar value={avgProgress} className="max-w-[220px]" />
                        <span className="text-xs font-medium text-[#8C7A70]">
                          {avgProgress}% avg{courseBatches.length > 1 ? ` across ${courseBatches.length} batches` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#8C7A70] sm:flex-col sm:items-end sm:gap-0.5">
                    <Clock className="h-3.5 w-3.5 sm:hidden" />
                    <span>{nextSessionForCourse(c.id)}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Schedule / Trainees pillar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Schedule</CardTitle>
              {primaryOfflineBatch && (
                <p className="mt-1 text-xs text-[#B7A79D]">Batch {primaryOfflineBatch.code}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {(primaryOfflineBatch ? scheduleForBatch(primaryOfflineBatch.id) : []).map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.isToday ? "bg-[#DE896A]" : "bg-[#E9D6CC]"}`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#B7A79D]">
                      {item.date} · {item.time}
                    </p>
                    <p className="truncate text-[13px] font-medium text-[#3A2A22]">{item.title}</p>
                    <p className="truncate text-xs text-[#8C7A70]">{item.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trainees Needing Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {trainees
                .filter((t) => t.atRisk)
                .slice(0, 4)
                .map((t) => {
                  const batch = batchById(t.batchId);
                  const course = courseById(t.courseId);
                  return (
                  <div key={t.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#3A2A22]">{t.name}</p>
                      <p className="flex items-center gap-1.5 text-xs text-[#B7A79D]">
                        {t.trainerId}
                        {batch && course && (
                          <>
                            <span>· {batch.code}</span>
                            <Badge tone={course.mode === "online" ? "blue" : "amber"} className="scale-75 origin-left px-1.5 py-0">
                              {course.mode}
                            </Badge>
                          </>
                        )}
                      </p>
                    </div>
                    <Badge tone="red">at risk</Badge>
                  </div>
                  );
                })}
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
