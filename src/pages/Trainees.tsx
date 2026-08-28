import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search, AlertTriangle, Users, ChevronDown, CheckCircle2, CircleDot, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar, avatarUrlFor } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { trainees, courses, courseById, batchById, batchesForCourse, traineeModuleProgress } from "@/data/mockData";
import type { ModuleStatus } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_META: Record<ModuleStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
  completed: { icon: CheckCircle2, className: "text-emerald-600", label: "Completed" },
  "in-progress": { icon: CircleDot, className: "text-[#DE896A]", label: "In progress" },
  "not-started": { icon: Circle, className: "text-[#D8C7BE]", label: "Not started" },
};

const ALL = "all";

export default function Trainees() {
  const location = useLocation();
  const requestedBatchId = (location.state as { batchId?: string } | null)?.batchId;
  const requestedBatch = requestedBatchId ? batchById(requestedBatchId) : undefined;

  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>(requestedBatch?.courseId ?? ALL);
  const [batchFilter, setBatchFilter] = useState<string>(requestedBatchId ?? ALL);
  const [riskOnly, setRiskOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Deep-linking in from My Courses ("View Progress" on a specific batch)
  // should jump straight to that course + batch even if this page was
  // already mounted.
  useEffect(() => {
    if (requestedBatchId && requestedBatch) {
      setCourseFilter(requestedBatch.courseId);
      setBatchFilter(requestedBatchId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedBatchId]);

  const batchOptions = useMemo(
    () => (courseFilter === ALL ? [] : batchesForCourse(courseFilter)),
    [courseFilter]
  );

  function handleCourseChange(value: string) {
    setCourseFilter(value);
    setBatchFilter(ALL); // a batch id from the old course wouldn't apply here
  }

  const filtered = useMemo(
    () =>
      trainees.filter((t) => {
        if (courseFilter !== ALL && t.courseId !== courseFilter) return false;
        if (batchFilter !== ALL && t.batchId !== batchFilter) return false;
        if (riskOnly && !t.atRisk) return false;
        if (query.trim() && !t.name.toLowerCase().includes(query.toLowerCase()) && !t.trainerId.toLowerCase().includes(query.toLowerCase()))
          return false;
        return true;
      }),
    [query, courseFilter, batchFilter, riskOnly]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#3A2A22]">Trainees</h1>
          <p className="text-sm text-[#8C7A70]">
            Lesson completion, quiz scores, and attendance at a glance — every batch tracked on its own, expand a
            trainee to see every module handled in their batch.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-[#8C7A70] shadow-sm shadow-[#DE896A]/5 border border-[#F5E2DA]">
          <Users className="h-4 w-4 text-[#DE896A]" /> {trainees.length} total
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or ID..."
            className="h-10 w-full rounded-xl border border-[#F0DED4] bg-white pl-9 pr-3 text-sm text-[#3A2A22] placeholder:text-[#C7B6AC] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20"
          />
        </div>
        <select
          value={courseFilter}
          onChange={(e) => handleCourseChange(e.target.value)}
          className="h-10 rounded-xl border border-[#F0DED4] bg-white px-3 text-sm text-[#3A2A22] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20"
        >
          <option value={ALL}>All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.level}
            </option>
          ))}
        </select>
        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          disabled={courseFilter === ALL}
          className="h-10 rounded-xl border border-[#F0DED4] bg-white px-3 text-sm text-[#3A2A22] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value={ALL}>All batches</option>
          {batchOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} — {b.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setRiskOnly((v) => !v)}
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors",
            riskOnly ? "border-red-200 bg-red-50 text-red-600" : "border-[#F0DED4] bg-white text-[#8C7A70] hover:bg-[#FBECE7]"
          )}
        >
          <AlertTriangle className="h-4 w-4" /> At-risk only
        </button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-[#B7A79D]">
                <th className="px-5 py-3">Trainee</th>
                <th className="px-5 py-3">Batch / Course</th>
                <th className="px-5 py-3">Lesson Completion</th>
                <th className="px-5 py-3">Quiz Score</th>
                <th className="px-5 py-3">Attendance</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5E2DA]">
              {filtered.map((t) => {
                const course = courseById(t.courseId);
                const batch = batchById(t.batchId);
                const isExpanded = expandedId === t.id;
                const moduleProgress = isExpanded ? traineeModuleProgress(t) : [];
                const completedCount = moduleProgress.filter((mp) => mp.status === "completed").length;

                return (
                  <Fragment key={t.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : t.id)}
                      className={cn("cursor-pointer hover:bg-[#FFFBF9]", isExpanded && "bg-[#FFFBF9]")}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 text-[#C7B6AC] transition-transform duration-200",
                              isExpanded && "rotate-180 text-[#DE896A]"
                            )}
                          />
                          <Avatar initials={t.initials} src={avatarUrlFor(t.id)} />
                          <div>
                            <p className="font-medium text-[#3A2A22]">{t.name}</p>
                            <p className="text-xs text-[#B7A79D]">ID: {t.trainerId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[#6B5A52]">
                        {course?.name}
                        {batch && course && (
                          <span className="ml-1.5 inline-flex items-center gap-1.5 text-xs text-[#B7A79D]">
                            · {batch.code} 
                            <Badge tone={course.mode === "online" ? "blue" : "amber"} className="scale-75 origin-left px-1.5 py-0">
                              {course.mode}
                            </Badge>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={t.lessonCompletion} className="w-24" />
                          <span className="text-xs text-[#8C7A70]">{t.lessonCompletion}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn("text-sm font-medium", t.quizScore < 60 ? "text-red-500" : "text-[#3A2A22]")}>
                          {t.quizScore}%
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn("text-sm font-medium", t.attendance < 75 ? "text-red-500" : "text-[#3A2A22]")}>
                          {t.attendance}%
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {t.atRisk ? (
                          <Badge tone="red">
                            <AlertTriangle className="h-3 w-3" /> at risk
                          </Badge>
                        ) : (
                          <Badge tone="green">on track</Badge>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-[#FFFBF9]">
                        <td colSpan={6} className="px-5 pb-5 pt-0">
                          <div className="rounded-xl border border-[#F0DED4] bg-white p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[#B7A79D]">
                                Every module in this batch — {course?.name} ({batch?.code ?? "self-paced"})
                              </p>
                              <span className="text-xs font-medium text-[#8C7A70]">
                                {completedCount}/{moduleProgress.length} modules completed
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {moduleProgress.map(({ module, status }) => {
                                const meta = STATUS_META[status];
                                return (
                                  <div
                                    key={module.id}
                                    className="flex items-center gap-2 rounded-lg bg-[#FFFBF9] px-3 py-2"
                                  >
                                    <meta.icon className={cn("h-4 w-4 shrink-0", meta.className)} />
                                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#3A2A22]">
                                      {module.title}
                                    </span>
                                    <span className={cn("shrink-0 text-[10px] font-semibold", meta.className)}>
                                      {meta.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <CardContent className="py-10 text-center text-sm text-[#B7A79D]">No trainees match these filters.</CardContent>
        )}
      </Card>
    </div>
  );
}
