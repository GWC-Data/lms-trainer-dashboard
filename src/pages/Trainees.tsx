import { Fragment, useEffect, useMemo, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Search, AlertTriangle, Users, ChevronDown, CheckCircle2, CircleDot, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  getTrainerBatchesApi,
  getTrainerCoursesApi,
  getTraineesApi,
  getTraineeDetailsApi,
  type BackendBatchItem,
  type TrainerCourseItem,
  type TraineeListItem,
} from "@/services/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import PageLoader from "@/components/ui/PageLoader";
import { cn } from "@/lib/utils";

function cleanDisplayString(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/\s*-\s*cid-[a-zA-Z0-9_-]+/gi, "")
    .replace(/\s*-\s*[0-9a-fA-F-]{36}/gi, "")
    .replace(/^cid-[a-zA-Z0-9_-]+\s*/gi, "")
    .trim();
}

const ALL = "all";

export default function Trainees() {
  const location = useLocation();
  const requestedState = location.state as {
    batchId?: string;
    traineeId?: string;
    search?: string;
    riskOnly?: boolean;
  } | null;

  const requestedBatchId = requestedState?.batchId;
  const requestedTraineeId = requestedState?.traineeId;
  const requestedSearch = requestedState?.search;
  const requestedRiskOnly = requestedState?.riskOnly;

  const [courses, setCourses] = useState<TrainerCourseItem[]>([]);
  const [batches, setBatches] = useState<BackendBatchItem[]>([]);
  const [loadingSelectors, setLoadingSelectors] = useState(true);

  const [query, setQuery] = useState(requestedSearch ?? "");
  const [courseFilter, setCourseFilter] = useState<string>(ALL);
  const [batchFilter, setBatchFilter] = useState<string>(requestedBatchId ?? ALL);
  const [modeFilter, setModeFilter] = useState<string>(ALL);
  const [riskOnly, setRiskOnly] = useState(requestedRiskOnly ?? false);

  const [trainees, setTrainees] = useState<TraineeListItem[]>([]);
  const [loadingTrainees, setLoadingTrainees] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, any>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

  // 1. Load real courses and real batches
  useEffect(() => {
    let mounted = true;
    async function loadSelectors() {
      try {
        setLoadingSelectors(true);
        const [coursesRes, batchesData] = await Promise.all([
          getTrainerCoursesApi(),
          getTrainerBatchesApi(),
        ]);
        if (!mounted) return;
        const cList = coursesRes.courses || [];
        setCourses(cList);
        setBatches(batchesData || []);

        if (requestedBatchId) {
          const match = (batchesData || []).find((b) => b.id === requestedBatchId);
          if (match) {
            setBatchFilter(match.id);
            if (match.courseId) setCourseFilter(match.courseId);
          }
        }
      } catch (err) {
        console.error("Failed to load course/batch selectors:", err);
      } finally {
        if (mounted) setLoadingSelectors(false);
      }
    }
    loadSelectors();
    return () => {
      mounted = false;
    };
  }, [requestedBatchId]);

  // Rule 2: When Batch is selected, Course must match that Batch's real courseId
  function handleBatchChange(selectedId: string) {
    setBatchFilter(selectedId);
    if (selectedId === ALL) {
      setCourseFilter(ALL);
    } else {
      const b = batches.find((item) => item.id === selectedId);
      const targetCourseId = b?.courseId || b?.course?.id || "";
      setCourseFilter(targetCourseId);
    }
  }

  function handleCourseChange(selectedId: string) {
    setCourseFilter(selectedId);
    // If current batch does not belong to this new course, reset batch
    if (selectedId !== ALL && batchFilter !== ALL) {
      const b = batches.find((item) => item.id === batchFilter);
      if (b && b.courseId !== selectedId) {
        setBatchFilter(ALL);
      }
    }
  }

  // Available batches based on course filter
  const availableBatches = useMemo(() => {
    if (courseFilter === ALL) return batches;
    return batches.filter((b) => b.courseId === courseFilter);
  }, [batches, courseFilter]);

  // 2. Fetch real trainees based on filters
  const fetchTrainees = useCallback(async () => {
    try {
      setLoadingTrainees(true);
      const res = await getTraineesApi({
        courseId: courseFilter !== ALL ? courseFilter : undefined,
        batchId: batchFilter !== ALL ? batchFilter : undefined,
        search: query.trim() || undefined,
        mode: modeFilter !== ALL ? modeFilter : undefined,
        atRisk: riskOnly || undefined,
      });
      setTrainees(res.data?.trainees || []);
    } catch (err) {
      console.error("Failed to load trainees list:", err);
      setTrainees([]);
    } finally {
      setLoadingTrainees(false);
    }
  }, [courseFilter, batchFilter, query, modeFilter, riskOnly]);

  useEffect(() => {
    fetchTrainees();
  }, [fetchTrainees]);

  // 3. Lazy fetch trainee details on expand
  const handleToggleExpand = async (rowKey: string, traineeId: string) => {
    if (expandedId === rowKey) {
      setExpandedId(null);
      return;
    }
    setExpandedId(rowKey);

    if (!expandedDetails[traineeId]) {
      try {
        setLoadingDetails((prev) => ({ ...prev, [traineeId]: true }));
        const res = await getTraineeDetailsApi(traineeId);
        if (res.success && res.data) {
          setExpandedDetails((prev) => ({ ...prev, [traineeId]: res.data }));
        }
      } catch (err) {
        console.error("Failed to fetch trainee details:", err);
      } finally {
        setLoadingDetails((prev) => ({ ...prev, [traineeId]: false }));
      }
    }
  };

  // Auto-expand trainee when navigated from notification or dashboard At-Risk card
  useEffect(() => {
    if (requestedTraineeId && trainees.length > 0 && !expandedId) {
      const idx = trainees.findIndex(
        (t) => (t.id || (t as any).traineeId) === requestedTraineeId
      );
      if (idx !== -1) {
        const t = trainees[idx];
        const tId = t.id || (t as any).traineeId || `tr-${idx}`;
        const rowKey = `${tId}-${t.batchId || "nobatch"}-${idx}`;
        handleToggleExpand(rowKey, tId);
      }
    }
  }, [trainees, requestedTraineeId]);

  if ((loadingSelectors || loadingTrainees) && trainees.length === 0) {
    return <PageLoader text="Loading..." />;
  }

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
            placeholder="Search by name or email..."
            className="h-10 w-full rounded-xl border border-[#F0DED4] bg-white pl-9 pr-3 text-sm text-[#3A2A22] placeholder:text-[#C7B6AC] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20"
          />
        </div>

        {/* Batch filter: Primary Starting Point (ALL real batches) */}
        <div className="w-[180px]">
          <Select
            value={batchFilter}
            onValueChange={handleBatchChange}
            disabled={loadingSelectors}
          >
            <SelectTrigger className="h-10 rounded-xl border-[#F0DED4] bg-white text-xs font-medium text-[#3A2A22]">
              <SelectValue placeholder="Batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Batches</SelectItem>
              {batches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {cleanDisplayString(b.batchName)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Course filter: Strictly resolved from selected Batch */}
        <div className="w-[180px]">
          <Select
            value={courseFilter}
            onValueChange={handleCourseChange}
            disabled={loadingSelectors || batchFilter !== ALL}
          >
            <SelectTrigger className="h-10 rounded-xl border-[#F0DED4] bg-white text-xs font-medium text-[#3A2A22]">
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              {batchFilter === ALL ? (
                <>
                  <SelectItem value={ALL}>All Courses</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {cleanDisplayString(c.name)}
                    </SelectItem>
                  ))}
                </>
              ) : (
                (() => {
                  const matchedCourse = courses.find((c) => c.id === courseFilter);
                  const b = batches.find((item) => item.id === batchFilter);
                  const cName = matchedCourse?.name || b?.course?.courseName;
                  return cName ? (
                    <SelectItem value={courseFilter}>{cleanDisplayString(cName)} 🔒</SelectItem>
                  ) : (
                    <SelectItem value="none" disabled>
                      No course found
                    </SelectItem>
                  );
                })()
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Mode filter */}
        <div className="w-[130px]">
          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger className="h-10 rounded-xl border-[#F0DED4] bg-white text-xs font-medium text-[#3A2A22]">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All modes</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <button
          onClick={() => setRiskOnly((v) => !v)}
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors",
            riskOnly
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-[#F0DED4] bg-white text-[#8C7A70] hover:bg-[#FBECE7]"
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
              {loadingTrainees ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <PageLoader text="Loading..." className="min-h-[200px] py-6" />
                  </td>
                </tr>
              ) : trainees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#B7A79D]">
                    No trainees match these filters.
                  </td>
                </tr>
              ) : (
                trainees.map((t, idx) => {
                  const traineeId = t.id || (t as any).traineeId || `tr-${idx}`;
                  const rowKey = `${traineeId}-${t.batchId || "nobatch"}-${idx}`;
                  const isExpanded = expandedId === rowKey;
                  const displayName = t.name || (t as any).fullName || "Trainee";
                  const initials = displayName
                    .split(" ")
                    .filter(Boolean)
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "TR";

                  const details = expandedDetails[traineeId];
                  const isLoadingDetail = loadingDetails[traineeId];
                  const enrollments = details?.enrollments || [];

                  return (
                    <Fragment key={rowKey}>
                      <tr
                        onClick={() => handleToggleExpand(rowKey, traineeId)}
                        className={cn(
                          "cursor-pointer hover:bg-[#FFFBF9]",
                          isExpanded && "bg-[#FFFBF9]"
                        )}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 shrink-0 text-[#C7B6AC] transition-transform duration-200",
                                isExpanded && "rotate-180 text-[#DE896A]"
                              )}
                            />
                            <Avatar initials={initials} />
                            <div>
                              <p className="font-medium text-[#3A2A22]">{t.name}</p>
                              <p className="text-xs text-[#B7A79D]">{t.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-[#6B5A52]">
                          {t.courseName}
                          <span className="ml-1.5 inline-flex items-center gap-1.5 text-xs text-[#B7A79D]">
                            · {t.batchName}
                            <Badge
                              tone={t.mode === "online" ? "blue" : "amber"}
                              className="scale-75 origin-left px-1.5 py-0"
                            >
                              {t.mode}
                            </Badge>
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <ProgressBar value={t.progressPct} className="w-24" />
                            <span className="text-xs text-[#8C7A70]">{t.progressPct}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              t.quizAvgScore < 60 ? "text-red-500" : "text-[#3A2A22]"
                            )}
                          >
                            {t.quizAvgScore}%
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              t.attendancePct < 75 ? "text-red-500" : "text-[#3A2A22]"
                            )}
                          >
                            {t.attendancePct}%
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {t.isAtRisk ? (
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
                                  Modules & Lessons in Enrolled Batch — {t.courseName} ({t.batchName})
                                </p>
                                <span className="text-xs font-medium text-[#8C7A70]">
                                  {t.completedLessons}/{t.totalLessons} lessons completed
                                </span>
                              </div>

                              {isLoadingDetail ? (
                                <p className="mt-3 text-xs text-[#B7A79D]">Loading module hierarchy...</p>
                              ) : enrollments.length === 0 ? (
                                <p className="mt-3 text-xs text-[#B7A79D]">No module details available.</p>
                              ) : (
                                <div className="mt-3 space-y-3">
                                  {enrollments.map((enr: any, eIdx: number) => (
                                    <div key={`${enr.batchId || enr.courseId || "enr"}-${eIdx}`} className="space-y-2">
                                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {(enr.modules || []).map((m: any, mIdx: number) => (
                                          <div
                                            key={`${m.moduleId || "mod"}-${mIdx}`}
                                            className="flex items-center gap-2 rounded-lg bg-[#FFFBF9] px-3 py-2"
                                          >
                                            <CircleDot className="h-4 w-4 shrink-0 text-[#DE896A]" />
                                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#3A2A22]">
                                              {m.moduleName}
                                            </span>
                                            <span className="shrink-0 text-[10px] font-semibold text-[#8C7A70]">
                                              {(m.lessons || []).length} lessons
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
