import { Fragment, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation, useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  Search,
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleDot,
  Circle,
  Mail,
  BookOpen,
  Layers
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import {
  getTrainerFiltersApi,
  getTraineesApi,
  getTraineeDetailsApi,
  type BatchFilterItem,
  type CourseFilterItem,
  type TraineeListItem,
  type PaginationMetadata,
  type TraineeDetailData,
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
  const navigate = useNavigate();
  const { traineeId: routeTraineeId } = useParams<{ traineeId?: string }>();
  const [searchParams] = useSearchParams();
  const batchIdParam = searchParams.get("batchId") || undefined;

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

  // ── Single Trainee Detail Mode State ────────────────────────
  const [traineeDetail, setTraineeDetail] = useState<TraineeDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(Boolean(routeTraineeId));
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const currentTraineeId = routeTraineeId;
    if (!currentTraineeId) return;
    let active = true;
    async function fetchDetail() {
      try {
        setLoadingDetail(true);
        setDetailError(null);
        const res = await getTraineeDetailsApi(currentTraineeId!, batchIdParam);
        if (!active) return;
        if (res.success && res.data) {
          setTraineeDetail(res.data);
          const trName = res.data.trainee?.name;
          if (trName && typeof window !== "undefined") {
            sessionStorage.setItem(`trainee_name_${currentTraineeId}`, trName);
            window.dispatchEvent(
              new CustomEvent("lms:trainee-loaded", {
                detail: { id: currentTraineeId, name: trName },
              })
            );
          }
        } else {
          setDetailError("Trainee details could not be found.");
        }
      } catch (err: any) {
        if (!active) return;
        setDetailError(err?.response?.data?.message || "Failed to load trainee details.");
      } finally {
        if (active) setLoadingDetail(false);
      }
    }
    fetchDetail();
    return () => {
      active = false;
    };
  }, [routeTraineeId, batchIdParam]);

  // ── Normal List Mode State ─────────────────────────────────
  const [courses, setCourses] = useState<CourseFilterItem[]>([]);
  const [batches, setBatches] = useState<BatchFilterItem[]>([]);
  const [loadingSelectors, setLoadingSelectors] = useState(!routeTraineeId);

  const [query, setQuery] = useState(requestedSearch ?? "");
  const [courseFilter, setCourseFilter] = useState<string>(ALL);
  const [batchFilter, setBatchFilter] = useState<string>(requestedBatchId ?? ALL);
  const [modeFilter, setModeFilter] = useState<string>(ALL);
  const [riskOnly, setRiskOnly] = useState(requestedRiskOnly ?? false);

  const [page, setPage] = useState<number>(1);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);

  const [trainees, setTrainees] = useState<TraineeListItem[]>([]);
  const [loadingTrainees, setLoadingTrainees] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, any>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

  // 1. Load real courses and batches via lightweight filter endpoints (ONLY when NOT in detail mode)
  useEffect(() => {
    if (routeTraineeId) return;
    let mounted = true;
    async function loadSelectors() {
      try {
        setLoadingSelectors(true);
        const { courses: courseFilters, batches: batchFilters } = await getTrainerFiltersApi();
        if (!mounted) return;
        setCourses(courseFilters || []);
        setBatches(batchFilters || []);

        if (requestedBatchId) {
          const match = (batchFilters || []).find((b) => b.id === requestedBatchId);
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
  }, [routeTraineeId, requestedBatchId]);

  // Rule 2: When Batch is selected, Course must match that Batch's real courseId
  function handleBatchChange(selectedId: string) {
    setPage(1);
    setBatchFilter(selectedId);
    if (selectedId === ALL) {
      setCourseFilter(ALL);
    } else {
      const b = batches.find((item) => item.id === selectedId);
      const targetCourseId = b?.courseId || "";
      if (targetCourseId) {
        setCourseFilter(targetCourseId);
      }
    }
  }

  function handleCourseChange(selectedId: string) {
    setPage(1);
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

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [query]);

  // 2. Fetch real trainees based on filters with database-level pagination
  const fetchTrainees = useCallback(async () => {
    try {
      setLoadingTrainees(true);
      const res = await getTraineesApi({
        courseId: courseFilter !== ALL ? courseFilter : undefined,
        batchId: batchFilter !== ALL ? batchFilter : undefined,
        search: debouncedQuery.trim() || undefined,
        mode: modeFilter !== ALL ? modeFilter : undefined,
        riskOnly: riskOnly || undefined,
        page,
        limit: 20,
      });
      setTrainees(res.data?.trainees || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error("Failed to load trainees list:", err);
      setTrainees([]);
    } finally {
      setLoadingTrainees(false);
    }
  }, [courseFilter, batchFilter, debouncedQuery, modeFilter, riskOnly, page]);

  // Only trigger trainee fetch once selector metadata (and any batch->course resolution) is ready
  useEffect(() => {
    if (routeTraineeId) return;
    if (loadingSelectors) return;
    fetchTrainees();
  }, [routeTraineeId, loadingSelectors, fetchTrainees]);

  // 3. Lazy fetch trainee details on expand
  const handleToggleExpand = async (rowKey: string, traineeId: string, batchId?: string) => {
    if (expandedId === rowKey) {
      setExpandedId(null);
      return;
    }
    setExpandedId(rowKey);

    const cacheKey = `${traineeId}-${batchId || "all"}`;
    if (!expandedDetails[cacheKey] && !expandedDetails[traineeId]) {
      try {
        setLoadingDetails((prev) => ({ ...prev, [cacheKey]: true, [traineeId]: true }));
        const res = await getTraineeDetailsApi(traineeId, batchId);
        if (res.success && res.data) {
          setExpandedDetails((prev) => ({
            ...prev,
            [cacheKey]: res.data,
            [traineeId]: res.data
          }));
        }
      } catch (err) {
        console.error("Failed to fetch trainee details:", err);
      } finally {
        setLoadingDetails((prev) => ({ ...prev, [cacheKey]: false, [traineeId]: false }));
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
        handleToggleExpand(rowKey, tId, t.batchId);
      }
    }
  }, [trainees, requestedTraineeId]);

  // ── Render Single Trainee Detail View ───────────────────────
  if (routeTraineeId) {
    if (loadingDetail) {
      return <PageLoader />;
    }

    if (detailError || !traineeDetail) {
      return (
        <div className="space-y-4 max-w-4xl mx-auto py-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 rounded-xl border-[#F0DED4] bg-white text-xs font-semibold text-[#7C695E] hover:bg-[#FBECE7] hover:text-[#DE896A]"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-red-800">{detailError || "Trainee details not found."}</p>
            <p className="text-xs text-red-600 mt-1">Please verify the trainee and batch identifiers.</p>
          </div>
        </div>
      );
    }

    const t = traineeDetail.trainee;
    const b = traineeDetail.batch;
    const c = traineeDetail.course;
    const p = traineeDetail.progress;
    const q = traineeDetail.quiz;
    const att = traineeDetail.attendance;
    const r = traineeDetail.risk;

    const initials = (t.name || "Trainee")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "TR";

    return (
      <div className="space-y-5 max-w-5xl mx-auto pb-10">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="h-9 px-3 rounded-xl border-[#F0DED4] bg-white text-xs font-semibold text-[#7C695E] hover:bg-[#FBECE7] hover:text-[#DE896A] transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-[#3A2A22]">Trainee Details</h1>
              <p className="text-xs text-[#8C7A70]">Comprehensive performance and curriculum tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="subtle"
              size="sm"
              onClick={() => navigate("/trainees")}
              className="text-xs font-semibold rounded-xl border border-[#F0DED4] bg-white text-[#7C695E] hover:bg-[#FBECE7] hover:text-[#DE896A]"
            >
              <Users className="h-3.5 w-3.5 mr-1 text-[#DE896A]" /> View All Trainees
            </Button>
          </div>
        </div>

        {/* Trainee Profile Card */}
        <Card className="rounded-2xl border border-[#F0DED4] bg-white shadow-xs p-5 sm:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-[#F5E2DA] pb-5">
            <div className="flex items-center gap-4">
              <Avatar
                initials={initials}
                className="h-16 w-16 text-lg font-bold bg-[#FBECE7] text-[#DE896A] shadow-inner"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-[#2E1F18]">{t.name}</h2>
                  <Badge
                    tone={t.status?.toLowerCase() === "active" ? "green" : "neutral"}
                    className="text-xs font-semibold px-2 py-0.5"
                  >
                    {t.status || "Active"}
                  </Badge>
                  {r.isAtRisk && (
                    <Badge tone="red" className="text-xs font-bold px-2 py-0.5 tracking-wider">
                      <AlertTriangle className="h-3 w-3 mr-1" /> AT RISK
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-[#8C7A70] flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-[#C7B6AC]" /> {t.email}
                  </span>
                </div>
              </div>
            </div>

            {r.isAtRisk && r.reason && (
              <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 max-w-sm">
                <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" /> Risk Factor
                </p>
                <p className="text-xs text-red-800 font-medium mt-0.5">{r.reason}</p>
              </div>
            )}
          </div>

          {/* Course & Batch Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5">
            <div className="rounded-xl border border-[#F0DED4] bg-[#FFFBF9] p-4 flex items-start gap-3.5">
              <div className="h-9 w-9 rounded-lg bg-[#FBECE7] text-[#DE896A] flex items-center justify-center shrink-0">
                <BookOpen className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A8988F]">Course</p>
                <p className="text-sm font-bold text-[#2E1F18] truncate">{cleanDisplayString(c.name) || "N/A"}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#F0DED4] bg-[#FFFBF9] p-4 flex items-start gap-3.5">
              <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Layers className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A8988F]">Batch</p>
                <p className="text-sm font-bold text-[#2E1F18] truncate">{cleanDisplayString(b.name) || "N/A"}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Module Completion */}
          <Card className="rounded-2xl border border-[#F0DED4] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8C7A70]">Module Completion</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#2E1F18]">{p.percentage}%</span>
                <span className="text-xs font-semibold text-[#8C7A70]">
                  ({p.completed}/{p.total} modules)
                </span>
              </div>
            </div>
            <div className="mt-4">
              <ProgressBar value={p.percentage} className="h-2 rounded-full" />
              <p className="text-[10.5px] text-[#A8988F] mt-1.5 font-medium">Curriculum progress</p>
            </div>
          </Card>

          {/* Quiz Score */}
          <Card className="rounded-2xl border border-[#F0DED4] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8C7A70]">Average Quiz Score</p>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-2xl font-black", q.score < 60 ? "text-red-600" : "text-[#2E1F18]")}>
                  {q.score}%
                </span>
                {q.score < 60 && (
                  <Badge tone="red" className="text-[10px] font-semibold px-1.5 py-0">Below 60%</Badge>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-[#8C7A70]">
              <span>Assessment benchmark</span>
              <span className="font-semibold">{q.score >= 60 ? "Passed" : "Needs Review"}</span>
            </div>
          </Card>

          {/* Attendance */}
          <Card className="rounded-2xl border border-[#F0DED4] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8C7A70]">Attendance Rate</p>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-2xl font-black", att.percentage < 75 ? "text-red-600" : "text-[#2E1F18]")}>
                  {att.percentage}%
                </span>
                {att.percentage < 75 && (
                  <Badge tone="red" className="text-[10px] font-semibold px-1.5 py-0">Below 75%</Badge>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-[#8C7A70]">
              <span>Session participation</span>
              <span className="font-semibold">{att.percentage >= 75 ? "Regular" : "Irregular"}</span>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if ((loadingSelectors || loadingTrainees) && trainees.length === 0) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#3A2A22]">Trainees</h1>
          <p className="text-xs text-[#8C7A70]">
            Module completion, quiz scores, and attendance at a glance — every batch tracked on its own, expand a
            trainee to see every module handled in their batch.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs text-[#8C7A70] shadow-xs border border-[#F5E2DA]">
          <Users className="h-3.5 w-3.5 text-[#DE896A]" /> {trainees.length} total
        </div>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#C7B6AC]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="h-9 w-full rounded-xl border border-[#F0DED4] bg-white pl-9 pr-3 text-xs text-[#3A2A22] placeholder:text-[#C7B6AC] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20"
          />
        </div>

        {/* Batch filter: Primary Starting Point (ALL real batches) */}
        <div className="w-[170px]">
          <Select
            value={batchFilter}
            onValueChange={handleBatchChange}
            disabled={loadingSelectors}
          >
            <SelectTrigger className="h-9 rounded-xl border-[#F0DED4] bg-white text-xs font-medium text-[#3A2A22]">
              <SelectValue placeholder="Batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Batches</SelectItem>
              {batches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {cleanDisplayString(b.name || (b as any).batchName)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Course filter: Strictly resolved from selected Batch */}
        <div className="w-[170px]">
          <Select
            value={courseFilter}
            onValueChange={handleCourseChange}
            disabled={loadingSelectors || batchFilter !== ALL}
          >
            <SelectTrigger className="h-9 rounded-xl border-[#F0DED4] bg-white text-xs font-medium text-[#3A2A22]">
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
                  const cName = matchedCourse?.name || (b?.courseId ? courses.find((c) => c.id === b.courseId)?.name : null);
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
        <div className="w-[120px]">
          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger className="h-9 rounded-xl border-[#F0DED4] bg-white text-xs font-medium text-[#3A2A22]">
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
            "flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors",
            riskOnly
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-[#F0DED4] bg-white text-[#8C7A70] hover:bg-[#FBECE7]"
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" /> At-risk only
        </button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[#B7A79D]">
                <th className="px-4 sm:px-5 py-3">Trainee</th>
                <th className="px-4 sm:px-5 py-3">Batch / Course</th>
                <th className="px-4 sm:px-5 py-3">Module Completion</th>
                <th className="px-4 sm:px-5 py-3">Quiz Score</th>
                <th className="px-4 sm:px-5 py-3">Attendance</th>
                <th className="px-4 sm:px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5E2DA]">
              {loadingTrainees ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <PageLoader className="min-h-[180px] py-6" />
                  </td>
                </tr>
              ) : trainees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-xs text-[#B7A79D]">
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

                  const detailsKey = `${traineeId}-${t.batchId || "all"}`;
                  const details = expandedDetails[detailsKey] || expandedDetails[traineeId];
                  const isLoadingDetail = loadingDetails[detailsKey] || loadingDetails[traineeId];
                  const enrollments = (details?.courses || details?.enrollments || []).filter(
                    (enr: any) => !t.batchId || enr.batchId === t.batchId || enr.batch?.batchId === t.batchId
                  );

                  // Pre-start batch detection: batch start date is in the future AND no attendance sessions have been conducted
                  const matchedBatch = batches.find((b) => b.id === t.batchId);
                  const batchStartDate = matchedBatch?.startDate;
                  const isBatchNotStarted = Boolean(
                    batchStartDate && new Date(batchStartDate).getTime() > Date.now()
                  );
                  const hasNoActivity =
                    (t.attendanceSessions?.total ?? (t as any).totalAttendanceSessions ?? 0) === 0 &&
                    (t.quizCompleted ?? 0) === 0 &&
                    (t.progressPct ?? 0) === 0;

                  const isPreStart = isBatchNotStarted && hasNoActivity;

                  return (
                    <Fragment key={rowKey}>
                      <tr
                        onClick={() => handleToggleExpand(rowKey, traineeId, t.batchId)}
                        className={cn(
                          "cursor-pointer hover:bg-[#FFFBF9] transition-colors",
                          isExpanded && "bg-[#FFFBF9]"
                        )}
                      >
                        <td className="px-4 sm:px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <ChevronDown
                              className={cn(
                                "h-3.5 w-3.5 shrink-0 text-[#C7B6AC] transition-transform duration-200",
                                isExpanded && "rotate-180 text-[#DE896A]"
                              )}
                            />
                            <Avatar initials={initials} className="h-8 w-8 text-xs font-semibold" />
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-[#3A2A22] truncate">{t.name}</p>
                              <p className="text-[11px] text-[#B7A79D] truncate">{t.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-5 py-3 text-[#6B5A52]">
                          <span className="font-medium text-xs text-[#3A2A22]">{t.courseName}</span>
                          <span className="ml-1.5 inline-flex items-center gap-1.5 text-[11px] text-[#8C7A70]">
                            · {t.batchName}
                            <Badge
                              tone={t.mode === "online" ? "blue" : "amber"}
                              className="scale-90 origin-left px-1.5 py-0 text-[10px]"
                            >
                              {t.mode}
                            </Badge>
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 py-3">
                          {isPreStart ? (
                            <span className="text-xs font-medium text-[#B7A79D]">Not started</span>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <ProgressBar value={t.progressPct} className="w-20" />
                                <span className="text-xs font-medium text-[#8C7A70]">{t.progressPct}%</span>
                              </div>
                              <span className="text-[10px] text-[#A8988F] block mt-0.5">
                                {t.completedModules ?? 0}/{t.totalModules ?? 0} modules completed
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 sm:px-5 py-3">
                          {isPreStart ? (
                            <span className="text-xs font-medium text-[#B7A79D]">—</span>
                          ) : (
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                t.quizAvgScore < 60 ? "text-red-500" : "text-[#3A2A22]"
                              )}
                            >
                              {t.quizAvgScore}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 sm:px-5 py-3">
                          {isPreStart ? (
                            <span className="text-xs font-medium text-[#B7A79D]">—</span>
                          ) : (
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                t.attendancePct < 75 ? "text-red-500" : "text-[#3A2A22]"
                              )}
                            >
                              {t.attendancePct}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 sm:px-5 py-3">
                          {t.isAtRisk ? (
                            <Badge tone="red" className="text-[11px] font-semibold px-2 py-0.5">
                              <AlertTriangle className="h-3 w-3" /> at risk
                            </Badge>
                          ) : (
                            <Badge tone="green" className="text-[11px] font-semibold px-2 py-0.5">
                              on track
                            </Badge>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[#FFFBF9]">
                          <td colSpan={6} className="px-4 sm:px-5 pb-4 pt-0">
                            <div className="rounded-xl border border-[#F0DED4] bg-white p-3.5 sm:p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#B7A79D]">
                                  Modules in Enrolled Batch — {t.courseName} ({t.batchName})
                                </p>
                                <span className="text-xs font-medium text-[#8C7A70]">
                                  {isPreStart
                                    ? "Batch not started"
                                    : `${t.completedModules ?? 0}/${t.totalModules ?? 0} modules completed`}
                                </span>
                              </div>

                              {isLoadingDetail ? (
                                <PageLoader size="sm" className="min-h-[70px] py-3" />
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
                                            className="flex items-center gap-2 rounded-lg bg-[#FFFBF9] px-3 py-2 border border-[#F5E2DA]/60"
                                          >
                                            <CircleDot className="h-4 w-4 shrink-0 text-[#DE896A]" />
                                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#3A2A22]" title={m.moduleName}>
                                              {m.moduleName}
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

        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#F5E2DA] bg-[#FFFBF9]">
            <p className="text-xs text-[#8C7A70]">
              Showing <span className="font-semibold text-[#3A2A22]">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
              <span className="font-semibold text-[#3A2A22]">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of <span className="font-semibold text-[#3A2A22]">{pagination.total}</span> trainees
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPreviousPage || loadingTrainees}
                className="h-8 px-2.5 text-xs text-[#3A2A22] border-[#F5E2DA] hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-xs font-medium text-[#3A2A22] px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={!pagination.hasNextPage || loadingTrainees}
                className="h-8 px-2.5 text-xs text-[#3A2A22] border-[#F5E2DA] hover:bg-white"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
