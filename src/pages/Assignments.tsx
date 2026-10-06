import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  PencilLine,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  X,
  GraduationCap,
  Users,
  Calendar,
  ArrowRight,
  ExternalLink,
  FileText,
  Check,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageLoader from "@/components/ui/PageLoader";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Separator } from "@/components/ui/Separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import AddAssignmentModal from "@/components/forms/AddAssignmentModal";
import {
  getAssignmentsApi,
  getTrainerFiltersApi,
  getAssignmentSubmissionsApi,
  scoreAssignmentSubmissionApi,
  type AssignmentItem,
  type AssignmentSubmissionItem,
  type BatchFilterItem,
  type CourseFilterItem,
  type PaginationMetadata,
} from "@/services/api";
import Pagination from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";

function getInitials(name?: string): string {
  if (!name || !name.trim()) return "TR";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

function cleanDisplayString(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/\s*-\s*cid-[a-zA-Z0-9_-]+/gi, "")
    .replace(/\s*-\s*[0-9a-fA-F-]{36}/gi, "")
    .replace(/^cid-[a-zA-Z0-9_-]+\s*/gi, "")
    .trim();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function triggerDownload(url: string, filename?: string) {
  const a = document.createElement("a");
  a.href = url;
  if (filename) a.download = filename;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function Assignments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const urlBatchId = searchParams.get("batchId") || "ALL";
  const urlCourseId = searchParams.get("courseId") || "ALL";
  const urlPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  // Reference data
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [batches, setBatches] = useState<BatchFilterItem[]>([]);
  const [courses, setCourses] = useState<CourseFilterItem[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);

  // Page state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(urlBatchId);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(urlCourseId);

  // Server-side pagination
  const limit = 6;
  const [page, setPage] = useState<number>(urlPage);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);

  const isFirstMountRef = useRef(true);

  // Active assignment & submissions
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmissionItem[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

  // Grading form state
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [scoring, setScoring] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);

  // Ref to detail view for smooth scrolling on card click
  const detailRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Initial Load: Lightweight Trainer Filters (Once on mount)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function loadFilters() {
      try {
        setLoadingRef(true);
        const filtersRes = await getTrainerFiltersApi().catch((err) => {
          console.warn("Failed to load trainer filters:", err);
          return { courses: [] as CourseFilterItem[], batches: [] as BatchFilterItem[] };
        });

        if (!mounted) return;

        setBatches(filtersRes.batches || []);
        setCourses(filtersRes.courses || []);
      } catch (err) {
        console.error("Failed to load trainer filters:", err);
      } finally {
        if (mounted) setLoadingRef(false);
      }
    }

    loadFilters();
    return () => {
      mounted = false;
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Debounce search query and reset page to 1
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Synchronize URL search params with active filters
  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedSearch.trim()) next.set("search", debouncedSearch.trim());
    if (selectedBatchId && selectedBatchId !== "ALL" && selectedBatchId !== "all") next.set("batchId", selectedBatchId);
    if (selectedCourseId && selectedCourseId !== "ALL" && selectedCourseId !== "all" && selectedCourseId !== "none") {
      next.set("courseId", selectedCourseId);
    }
    if (page > 1) next.set("page", String(page));
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, selectedBatchId, selectedCourseId, page, setSearchParams]);

  // Sync external URL changes
  useEffect(() => {
    const s = searchParams.get("search") || "";
    const b = searchParams.get("batchId") || "ALL";
    const c = searchParams.get("courseId") || "ALL";
    const p = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

    if (s !== debouncedSearch) {
      setSearchQuery(s);
      setDebouncedSearch(s);
    }
    if (b !== selectedBatchId) {
      setSelectedBatchId(b);
    }
    if (c !== selectedCourseId) {
      setSelectedCourseId(c);
    }
    if (p !== page) {
      setPage(p);
    }
  }, [searchParams]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Canonical Batch → Course Resolution
  // ─────────────────────────────────────────────────────────────────────────────
  const selectedBatch = useMemo(() => {
    if (selectedBatchId === "ALL" || selectedBatchId === "all") return null;
    return batches.find((b) => b.id === selectedBatchId) || null;
  }, [selectedBatchId, batches]);

  const batchResolvedCourseId = useMemo(() => {
    if (!selectedBatch) return null;
    return selectedBatch.courseId || (selectedBatch as any).course?.id || null;
  }, [selectedBatch]);

  const batchResolvedCourse = useMemo(() => {
    if (!batchResolvedCourseId) return null;
    return (
      courses.find((c) => (c.id || (c as any).courseId) === batchResolvedCourseId) || null
    );
  }, [batchResolvedCourseId, courses]);

  const availableBatches = useMemo(() => {
    if (selectedCourseId === "ALL" || selectedCourseId === "all" || !selectedCourseId) return batches;
    return batches.filter((b) => b.courseId === selectedCourseId);
  }, [batches, selectedCourseId]);

  const batchHasNoCourse = Boolean(selectedBatch && !batchResolvedCourseId);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Fetch Assignments from Backend (Server-Side Filtered & Paginated)
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchAssignments = useCallback(async () => {
    if (batchHasNoCourse) {
      setAssignments([]);
      setPagination(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await getAssignmentsApi({
        courseId:
          selectedCourseId !== "ALL" && selectedCourseId !== "all" && selectedCourseId !== "none"
            ? selectedCourseId
            : undefined,
        batchId: selectedBatchId !== "ALL" && selectedBatchId !== "all" ? selectedBatchId : undefined,
        search: debouncedSearch.trim() || undefined,
        page,
        limit,
      });

      if (!isMountedRef.current) return;

      const list = res?.assignments || [];
      setAssignments(list);
      setPagination(res?.pagination || null);

      if (list.length > 0) {
        setActiveAssignmentId((prev) =>
          !prev || !list.some((a) => a.id === prev) ? list[0].id : prev
        );
      } else {
        setActiveAssignmentId(null);
        setSubmissions([]);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error("Failed to load assignments:", err);
      const status = err?.response?.status || 500;
      const msg = err?.response?.data?.message || err?.message || "Failed to load assignments.";
      setError({ status, message: msg });
      if (status === 403) {
        toast.error("Permission denied to view assignments.");
      } else {
        toast.error("Failed to load assignments.");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [selectedCourseId, selectedBatchId, debouncedSearch, page, limit, batchHasNoCourse]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!loadingRef) {
      fetchAssignments();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [loadingRef, fetchAssignments]);

  // Handle batch selection
  const handleBatchChange = (newBatchId: string) => {
    setPage(1);
    setSelectedBatchId(newBatchId);
    setActiveSubmissionId(null);

    if (newBatchId !== "ALL" && newBatchId !== "all") {
      const foundBatch = batches.find((b) => b.id === newBatchId);
      const targetCourseId = foundBatch?.courseId;
      if (targetCourseId) {
        setSelectedCourseId(targetCourseId);
      }
    }
  };

  // Handle course selection
  const handleCourseChange = (newCourseId: string) => {
    setPage(1);
    setSelectedCourseId(newCourseId);
    setActiveSubmissionId(null);

    if (newCourseId !== "ALL" && newCourseId !== "all" && selectedBatchId !== "ALL" && selectedBatchId !== "all") {
      const currentBatch = batches.find((b) => b.id === selectedBatchId);
      if (currentBatch && currentBatch.courseId && currentBatch.courseId !== newCourseId) {
        setSelectedBatchId("ALL");
      }
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedBatchId("ALL");
    setSelectedCourseId("ALL");
    setActiveSubmissionId(null);
    setPage(1);
  };

  const isFiltered = searchQuery.trim() !== "" || (selectedBatchId !== "ALL" && selectedBatchId !== "all") || (selectedCourseId !== "ALL" && selectedCourseId !== "all");

  const filteredAssignments = assignments;
  const paginatedAssignments = assignments;

  // Active assignment object
  const activeAssignment = useMemo(() => {
    if (!activeAssignmentId) return null;
    return assignments.find((a) => a.id === activeAssignmentId) || null;
  }, [activeAssignmentId, assignments]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Submissions Fetching for Active Assignment
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeAssignmentId) {
      setSubmissions([]);
      setActiveSubmissionId(null);
      return;
    }

    let cancelled = false;
    setLoadingSubmissions(true);
    setActiveSubmissionId(null);
    setMarks("");
    setFeedback("");

    getAssignmentSubmissionsApi(activeAssignmentId)
      .then((data) => {
        if (cancelled) return;
        setSubmissions(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load submissions:", err);
        setSubmissions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSubmissions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeAssignmentId]);

  const activeSubmission = useMemo(() => {
    if (!activeSubmissionId) return null;
    return submissions.find((s) => s.id === activeSubmissionId) || null;
  }, [activeSubmissionId, submissions]);

  // Open submission for review
  function openSubmission(s: AssignmentSubmissionItem) {
    setActiveSubmissionId(s.id);
    setMarks(s.obtainedMarks !== undefined && s.obtainedMarks !== null ? s.obtainedMarks.toString() : "");
    setFeedback(s.feedback ?? "");
  }

  // Publish / Score submission
  async function publishResult() {
    if (!activeAssignmentId || !activeSubmission) return;
    const marksNum = Number(marks);
    if (isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
      toast.error("Please enter a valid mark percentage between 0 and 100.");
      return;
    }

    setScoring(true);
    try {
      const res = await scoreAssignmentSubmissionApi(activeAssignmentId, activeSubmission.id, {
        obtainedMarks: marksNum,
        totalMarks: 100,
        feedback: feedback.trim(),
      });

      if (res.success) {
        toast.success("Result published successfully!");
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === activeSubmission.id
              ? {
                  ...s,
                  status: "graded",
                  obtainedMarks: marksNum,
                  obtainedPercentage: marksNum,
                  feedback: feedback.trim(),
                }
              : s
          )
        );
        setActiveSubmissionId(null);
        setMarks("");
        setFeedback("");

        // Refresh assignments to update submission and pending counts
        await fetchAssignments();
      } else {
        toast.error(res.message || "Failed to publish result.");
      }
    } catch (err: any) {
      console.error("Error scoring submission:", err);
      toast.error(err?.response?.data?.message || "Failed to publish result.");
    } finally {
      setScoring(false);
    }
  }

  // Card click handler
  const handleSelectAssignment = (id: string) => {
    setActiveAssignmentId(id);
    setActiveSubmissionId(null);
    if (detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Submission statistics
  const submissionStats = useMemo(() => {
    if (!activeAssignment) return { total: 0, submitted: 0, pending: 0, evaluated: 0 };
    const total = activeAssignment.totalTrainees ?? 0;
    const submitted = activeAssignment.submissions ?? activeAssignment.submissionCount ?? 0;
    const pending = activeAssignment.pendingReview ?? 0;
    const evaluated = Math.max(0, submitted - pending);
    return { total, submitted, pending, evaluated };
  }, [activeAssignment]);

  if (loading && assignments.length === 0) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP TOOLBAR                                                            */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between w-full min-w-0">
        <div>
          <h1 className="text-2xl font-bold text-[#3A2A22] tracking-tight">Assignments</h1>
          <p className="text-sm text-[#8C7A70] mt-0.5">
            Manage assignments, review submissions, and publish results.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto min-w-0">
          {/* Search Input using shadcn Input */}
          <div className="relative w-full sm:w-56 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#B7A79D] pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assignments..."
              className="pl-9 pr-8 h-10 text-xs rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#B7A79D] hover:text-[#3A2A22]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Batch Filter using shadcn Select */}
          <div className="w-full sm:w-44 min-w-0">
            <Select value={selectedBatchId} onValueChange={handleBatchChange}>
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder="All Batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Batches</SelectItem>
                {availableBatches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {cleanDisplayString(b.batchName || b.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Course Filter using shadcn Select */}
          <div className="w-full sm:w-48 min-w-0">
            <Select
              value={selectedCourseId || "ALL"}
              onValueChange={handleCourseChange}
            >
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id || (c as any).courseId} value={c.id || (c as any).courseId}>
                    {cleanDisplayString(c.courseName || c.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters button */}
          {isFiltered && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-10 px-3 text-xs text-[#8C7A70] hover:text-[#3A2A22]"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1 text-[#DE896A]" /> Clear
            </Button>
          )}

          {/* Create Assignment button */}
          <Button onClick={() => setModalOpen(true)} className="h-10 text-xs">
            <Plus className="h-4 w-4 mr-1" /> Create Assignment
          </Button>
        </div>
      </div>

      {/* Active Batch Context / Orphan Warning */}
      {selectedBatch && (
        <div className="rounded-xl border border-[#F0EAE6] bg-[#FFFBF9] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-[#DE896A]" />
            <span className="font-semibold text-[#233047]">Batch: {cleanDisplayString(selectedBatch.batchName)}</span>
            <span className="text-[#B7A79D]">·</span>
            <GraduationCap className="h-3.5 w-3.5 text-[#DE896A]" />
            <span className="text-[#6B5A52]">
              {batchResolvedCourse
                ? `Course: ${cleanDisplayString(batchResolvedCourse.courseName)}`
                : "No course assigned to this batch"}
            </span>
          </div>
          {batchHasNoCourse && (
            <Badge tone="amber">Orphan Batch</Badge>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 2. LOADING / ERROR / EMPTY STATES                                         */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 rounded-2xl border border-[#F5E2DA] bg-white p-5 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="h-4 w-3/4 bg-[#F5E2DA] rounded" />
                  <div className="h-3 w-1/2 bg-[#F5E2DA]/60 rounded" />
                </div>
                <div className="h-3 w-1/3 bg-[#F5E2DA]/40 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50/50 p-12 text-center">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <h3 className="mt-3 text-base font-semibold text-[#3A2A22]">
            {error.status === 403 ? "Permission Denied" : "Failed to Load Assignments"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-[#8C7A70]">
            {error.status === 403
              ? "You do not have permission to view assignments. Please ensure you are logged in with an authorized trainer account."
              : error.message || "An unexpected error occurred while fetching assignments."}
          </p>
          <Button variant="outline" className="mt-4" onClick={fetchAssignments}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Try Again
          </Button>
        </div>
      ) : batchHasNoCourse ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-12 text-center">
          <AlertCircle className="h-10 w-10 text-amber-600" />
          <h3 className="mt-3 text-base font-semibold text-[#3A2A22]">No course assigned to this batch</h3>
          <p className="mt-1 max-w-sm text-sm text-[#8C7A70]">
            The selected batch has no allocated course in the database. Please select another batch.
          </p>
          <Button variant="outline" className="mt-4 text-xs" onClick={clearFilters}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> View All Assignments
          </Button>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E3D1C8] bg-white p-12 text-center">
          <PencilLine className="h-10 w-10 text-[#B7A79D]" />
          <h3 className="mt-3 text-base font-semibold text-[#3A2A22]">
            {isFiltered ? "No assignments match your filters" : "No assignments created yet"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-[#8C7A70]">
            {isFiltered
              ? "Try adjusting your search query, or clear batch and course filters."
              : "Create an assignment to assign tasks to your trainees."}
          </p>
          {isFiltered ? (
            <Button variant="outline" className="mt-4 text-xs" onClick={clearFilters}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear Filters
            </Button>
          ) : (
            <Button className="mt-4 text-xs" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create Assignment
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* ───────────────────────────────────────────────────────────────────── */}
          {/* 3. RESPONSIVE ASSIGNMENT CARDS GRID (No horizontal scrolling!)        */}
          {/* ───────────────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full min-w-0">
            {paginatedAssignments.map((a) => {
              const isSelected = a.id === activeAssignmentId;
              const pendingCount = a.pendingReview ?? 0;
              const subCount = a.submissions ?? a.submissionCount ?? 0;
              const totalCount = a.totalTrainees ?? 0;

              return (
                <Card
                  key={a.id}
                  onClick={() => handleSelectAssignment(a.id)}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-md hover:border-[#DE896A]/60 hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden group",
                    isSelected
                      ? "border-[#DE896A] bg-[#FFFBF9] ring-2 ring-[#DE896A]/20"
                      : "border-[#F5E2DA] bg-white hover:bg-[#FFFCFB]"
                  )}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs",
                            isSelected ? "bg-[#DE896A] text-white" : "bg-[#FBECE7] text-[#DE896A]"
                          )}
                        >
                          <PencilLine className="h-4 w-4" />
                        </div>
                        <h3 className="font-semibold text-sm text-[#3A2A22] truncate tracking-tight" title={cleanDisplayString(a.title)}>
                          {cleanDisplayString(a.title)}
                        </h3>
                      </div>

                      {pendingCount > 0 ? (
                        <Badge tone="amber" className="shrink-0">
                          <Clock3 className="h-3 w-3 mr-0.5" /> {pendingCount} Pending
                        </Badge>
                      ) : subCount > 0 ? (
                        <Badge tone="green" className="shrink-0">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" /> Evaluated
                        </Badge>
                      ) : (
                        <Badge tone="neutral" className="shrink-0">
                          In Progress
                        </Badge>
                      )}
                    </div>

                    {/* Metadata Context */}
                    <div className="mt-3 space-y-1.5 text-xs text-[#6B5A52]">
                      <div className="flex items-center gap-1.5 truncate">
                        <GraduationCap className="h-3.5 w-3.5 shrink-0 text-[#8C7A70]" />
                        <span className="truncate" title={cleanDisplayString(a.courseName)}>{cleanDisplayString(a.courseName) || "Allocated Course"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Users className="h-3.5 w-3.5 shrink-0 text-[#8C7A70]" />
                        <span className="truncate" title={cleanDisplayString(a.batchName)}>{cleanDisplayString(a.batchName) || "Allocated Batch"}</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2">
                    <Separator className="my-2.5" />
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-[#8C7A70]">
                        <Calendar className="h-3.5 w-3.5 text-[#B7A79D]" />
                        <span>Due {formatDate(a.dueDate)}</span>
                      </div>
                      <span className="font-medium text-[#233047]">
                        {subCount}/{totalCount} submitted
                      </span>
                    </div>

                    {a.attachmentUrl && (
                      <div className="mt-2.5 flex items-center justify-between rounded-lg bg-[#FFFBF9] border border-[#F5E2DA] px-2.5 py-1.5 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-[#DE896A]" />
                          <span className="truncate font-medium text-[#233047] text-[11px]" title={a.attachmentName || "Attachment"}>
                            {a.attachmentName || "Attachment"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(a.attachmentUrl, "_blank", "noopener,noreferrer");
                            }}
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10.5px] font-semibold text-[#DE896A] hover:bg-[#FBECE7] cursor-pointer"
                            title="View attachment"
                          >
                            <Eye className="h-3 w-3" /> View
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerDownload(a.attachmentUrl!, a.attachmentName || a.title);
                            }}
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10.5px] font-semibold text-[#8C7A70] hover:text-[#233047] hover:bg-[#F0EAE6] cursor-pointer"
                            title="Download attachment"
                          >
                            <Download className="h-3 w-3" /> Download
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#DE896A]">
                          <Check className="h-3.5 w-3.5" /> Selected
                        </span>
                      ) : (
                        <span className="text-xs text-[#8C7A70] group-hover:text-[#DE896A] inline-flex items-center gap-1 transition-colors">
                          Review Submissions <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {pagination && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              hasNextPage={pagination.hasNextPage}
              hasPreviousPage={pagination.hasPreviousPage}
              onPageChange={(newPage) => setPage(newPage)}
              loading={loading}
              itemLabel="assignments"
            />
          )}

          {/* ───────────────────────────────────────────────────────────────────── */}
          {/* 4. SELECTED ASSIGNMENT DETAIL & REVIEW SECTION                         */}
          {/* ───────────────────────────────────────────────────────────────────── */}
          {activeAssignment && (
            <div ref={detailRef} className="space-y-4 pt-4">
              {/* Active Assignment Header */}
              <div className="rounded-2xl border border-[#F5E2DA] bg-white p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-[#3A2A22]">
                        {cleanDisplayString(activeAssignment.title)}
                      </h2>
                      <Badge tone={submissionStats.pending > 0 ? "amber" : "green"}>
                        {submissionStats.pending > 0
                          ? `${submissionStats.pending} to review`
                          : "Up to date"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[#8C7A70]">
                      {cleanDisplayString(activeAssignment.courseName) || "Assigned Course"} ·{" "}
                      {cleanDisplayString(activeAssignment.batchName) || "Allocated Batch"} · Due{" "}
                      {formatDate(activeAssignment.dueDate)}
                    </p>
                  </div>
                </div>

                {/* Attachment Section if present */}
                {activeAssignment.attachmentUrl && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFFBF9] border border-[#F5E2DA] p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FBECE7] text-[#DE896A]">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#233047] truncate" title={activeAssignment.attachmentName || "Attachment"}>
                          {activeAssignment.attachmentName || "Attachment"}
                        </p>
                        <p className="text-[11px] text-[#8C7A70]">
                          {activeAssignment.attachmentType || "FILE"}
                          {activeAssignment.attachmentSize ? ` · ${formatFileSize(activeAssignment.attachmentSize)}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(activeAssignment.attachmentUrl, "_blank", "noopener,noreferrer")}
                        className="h-8 rounded-lg border-[#F0DED4] bg-white px-2.5 text-xs text-[#DE896A] hover:bg-[#FBECE7] cursor-pointer"
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" /> View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => triggerDownload(activeAssignment.attachmentUrl!, activeAssignment.attachmentName || activeAssignment.title)}
                        className="h-8 rounded-lg border-[#F0DED4] bg-white px-2.5 text-xs text-[#8C7A70] hover:text-[#233047] hover:bg-[#F0EAE6] cursor-pointer"
                      >
                        <Download className="mr-1 h-3.5 w-3.5" /> Download
                      </Button>
                    </div>
                  </div>
                )}

                {/* 4 Statistics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#F5E2DA]">
                  <div className="rounded-xl bg-[#FFFBF9] border border-[#F0EAE6] p-3 text-center">
                    <p className="text-[11px] font-semibold text-[#8C7A70] uppercase">Total Trainees</p>
                    <p className="text-lg font-bold text-[#233047] mt-0.5">{submissionStats.total}</p>
                  </div>
                  <div className="rounded-xl bg-[#FFFBF9] border border-[#F0EAE6] p-3 text-center">
                    <p className="text-[11px] font-semibold text-[#8C7A70] uppercase">Submitted</p>
                    <p className="text-lg font-bold text-[#233047] mt-0.5">{submissionStats.submitted}</p>
                  </div>
                  <div className="rounded-xl bg-[#FFFBF9] border border-[#F0EAE6] p-3 text-center">
                    <p className="text-[11px] font-semibold text-[#8C7A70] uppercase">Pending</p>
                    <p className="text-lg font-bold text-amber-600 mt-0.5">{submissionStats.pending}</p>
                  </div>
                  <div className="rounded-xl bg-[#FFFBF9] border border-[#F0EAE6] p-3 text-center">
                    <p className="text-[11px] font-semibold text-[#8C7A70] uppercase">Evaluated</p>
                    <p className="text-lg font-bold text-emerald-600 mt-0.5">{submissionStats.evaluated}</p>
                  </div>
                </div>
              </div>

              {/* Submissions List + Review Panel Split View */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                {/* Left 3 Cols: Trainee Submissions List */}
                <Card className="lg:col-span-3">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle>Trainee Submissions</CardTitle>
                      <CardDescription>
                        Click a submission to grade and provide individual feedback.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="divide-y divide-[#F5E2DA] p-0">
                    {loadingSubmissions ? (
                      <PageLoader className="min-h-[160px] py-6" />
                    ) : submissions.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#B7A79D]">
                        No submissions received yet for this assignment.
                      </div>
                    ) : (
                      submissions.map((s) => {
                        const isSelected = activeSubmissionId === s.id;
                        const isGraded = s.status === "graded" || s.status === "reviewed";

                        return (
                          <button
                            key={s.id}
                            onClick={() => openSubmission(s)}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 p-4 text-left transition-colors",
                              isSelected ? "bg-[#FFFBF9] ring-1 ring-inset ring-[#DE896A]/40" : "hover:bg-[#FFFBF9]"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar initials={getInitials(s.traineeName)} />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-[#3A2A22]">
                                  {cleanDisplayString(s.traineeName) || s.email || "Trainee"}
                                </p>
                                <p className="flex items-center gap-1.5 truncate text-[11px] text-[#B7A79D] mt-0.5">
                                  <span>Submitted {formatDate(s.submittedAt)}</span>
                                  {s.email && <span>· {s.email}</span>}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isGraded ? (
                                <Badge tone="green">
                                  <CheckCircle2 className="h-3 w-3 mr-0.5" /> {s.obtainedMarks ?? 0}%
                                </Badge>
                              ) : (
                                <Badge tone="amber">
                                  <Clock3 className="h-3 w-3 mr-0.5" /> Pending
                                </Badge>
                              )}
                              <ArrowRight className="h-3.5 w-3.5 text-[#B7A79D]" />
                            </div>
                          </button>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Right 2 Cols: Review & Feedback Panel using shadcn */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle>Review & Feedback</CardTitle>
                    <CardDescription>
                      Evaluate submission and publish grades for trainee.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!activeSubmission ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-[#B7A79D]">
                        <FileCheck2 className="h-9 w-9 text-[#E9D6CC]" />
                        <p className="font-medium text-[#6B5A52]">Select a submission to review</p>
                        <p className="max-w-xs text-[11px]">
                          Choose a trainee from the list on the left to enter scores and write feedback.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Trainee Card Header */}
                        <div className="flex items-center gap-3 rounded-xl border border-[#F0EAE6] bg-[#FFFBF9] p-3">
                          <Avatar initials={getInitials(activeSubmission.traineeName)} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#3A2A22] truncate">
                              {cleanDisplayString(activeSubmission.traineeName) || activeSubmission.email || "Trainee"}
                            </p>
                            <p className="text-[11px] text-[#8C7A70] truncate">
                              Submitted {formatDate(activeSubmission.submittedAt)}
                            </p>
                          </div>
                        </div>

                        {/* Submitted Content Preview */}
                        {activeSubmission.courseAssignmentAnswerFile ? (
                          <a
                            href={activeSubmission.courseAssignmentAnswerFile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between rounded-xl border border-[#EEAF9C] bg-[#FFFBF9] p-3 text-xs text-[#DE896A] font-semibold hover:bg-[#FBECE7] transition-colors"
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <FileText className="h-4 w-4 shrink-0" />
                              View Submitted File
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          </a>
                        ) : activeSubmission.submissionText ? (
                          <div className="rounded-xl border border-[#F0EAE6] bg-[#FFFBF9] p-3 text-xs text-[#6B5A52]">
                            <p className="font-semibold text-[#233047] mb-1">Submission Text:</p>
                            <p className="whitespace-pre-wrap">{activeSubmission.submissionText}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-[#B7A79D] italic">No file or text attached with this submission.</p>
                        )}

                        <Separator className="my-2" />

                        {/* Marks Input using shadcn Input */}
                        <div>
                          <Input
                            label="Marks (%)"
                            type="number"
                            min={0}
                            max={100}
                            value={marks}
                            onChange={(e) => setMarks(e.target.value)}
                            placeholder="e.g. 85"
                          />
                        </div>

                        {/* Feedback Textarea using shadcn Textarea */}
                        <div>
                          <Textarea
                            label="Feedback"
                            rows={4}
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Write actionable guidance, strengths, and areas to improve..."
                          />
                        </div>

                        {/* Publish Button using shadcn Button */}
                        <Button
                          onClick={publishResult}
                          className="w-full justify-center text-xs h-10"
                          disabled={marks === "" || scoring}
                        >
                          {scoring ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Publishing...
                            </>
                          ) : (
                            "Publish Result"
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Assignment Modal */}
      <AddAssignmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={fetchAssignments}
      />
    </div>
  );
}
