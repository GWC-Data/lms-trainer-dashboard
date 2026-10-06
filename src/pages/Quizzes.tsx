import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  ClipboardList,
  Trash2,
  Pencil,
  Loader2,
  Search,
  X,
  RotateCcw,
  HelpCircle,
  BookOpen,
  Layers,
  FileCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import PageLoader from "@/components/ui/PageLoader";
import Pagination from "@/components/ui/Pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import QuizFormModal from "@/components/forms/QuizFormModal";
import QuizResultsModal from "@/components/forms/QuizResultsModal";
import {
  getTrainerQuizzesApi,
  deleteQuizApi,
  getTrainerFiltersApi,
  type BackendQuizItem,
  type BatchFilterItem,
  type CourseFilterItem,
  type PaginationMetadata,
} from "@/services/api";
import type { Quiz } from "@/types";
import { toast } from "sonner";

function cleanDisplayString(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/\s*-\s*cid-[a-zA-Z0-9_-]+/gi, "")
    .replace(/\s*-\s*[0-9a-fA-F-]{36}/gi, "")
    .replace(/^cid-[a-zA-Z0-9_-]+\s*/gi, "")
    .replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/gi, "")
    .trim();
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "Recently";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Recently";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface QuizFilters {
  search: string;
  batchId: string;
  courseId: string;
  moduleId: string;
  status: string;
  page: number;
  limit: number;
}

export default function Quizzes() {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Reference dropdown data (Fetched once on mount)
  const [batches, setBatches] = useState<BatchFilterItem[]>([]);
  const [courses, setCourses] = useState<CourseFilterItem[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);

  // 2. Single source of truth for all filters & pagination
  const [filters, setFilters] = useState<QuizFilters>(() => ({
    search: searchParams.get("search") || "",
    batchId: searchParams.get("batchId") || "",
    courseId: searchParams.get("courseId") || "",
    moduleId: searchParams.get("moduleId") || "",
    status: searchParams.get("status") || "",
    page: Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1),
    limit: 10,
  }));

  // Local state for debounced search input
  const [searchInput, setSearchInput] = useState(filters.search);

  // 3. Quiz Data states
  const [quizzes, setQuizzes] = useState<BackendQuizItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & actions
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [resultsQuiz, setResultsQuiz] = useState<Quiz | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Load Reference Filters (Batches & Courses) ONLY ONCE on mount
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      try {
        setLoadingRef(true);
        const { courses: coursesRes, batches: batchesRes } = await getTrainerFiltersApi().catch((err) => {
          console.warn("Failed to load trainer filters:", err);
          return { courses: [] as CourseFilterItem[], batches: [] as BatchFilterItem[] };
        });

        if (!mounted) return;

        setBatches(batchesRes);
        setCourses(coursesRes);
      } catch (err) {
        console.error("Failed to load reference data for quizzes:", err);
      } finally {
        if (mounted) setLoadingRef(false);
      }
    }

    loadInitialData();
    return () => {
      mounted = false;
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Debounce search input (350ms): updates filters.search and resets page to 1
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => {
        if (prev.search === searchInput) return prev;
        return {
          ...prev,
          search: searchInput,
          page: 1,
        };
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Keep searchInput in sync if URL query parameter changes externally
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    if (urlSearch !== searchInput && urlSearch !== filters.search) {
      setSearchInput(urlSearch);
    }
  }, [searchParams, searchInput, filters.search]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Synchronize URL search params with active filters
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.search.trim()) next.set("search", filters.search.trim());
    if (filters.batchId && filters.batchId !== "all") next.set("batchId", filters.batchId);
    if (filters.courseId && filters.courseId !== "all" && filters.courseId !== "none") {
      next.set("courseId", filters.courseId);
    }
    if (filters.moduleId && filters.moduleId !== "all") next.set("moduleId", filters.moduleId);
    if (filters.status && filters.status !== "all") next.set("status", filters.status);
    if (filters.page > 1) next.set("page", String(filters.page));

    setSearchParams(next, { replace: true });
  }, [filters, setSearchParams]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch Quizzes from single Unified API: GET /api/trainer/quizzes
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTrainerQuizzesApi({
        page: filters.page,
        limit: filters.limit,
        search: filters.search.trim() || undefined,
        batchId: filters.batchId || undefined,
        courseId: filters.courseId || undefined,
        moduleId: filters.moduleId || undefined,
        status: filters.status || undefined,
      });

      setQuizzes(res.quizzes);
      setPagination(res.pagination || null);
    } catch (err: unknown) {
      console.error("Failed to load quizzes:", err);
      setError("Unable to load quizzes. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (!loadingRef) {
      fetchQuizzes();
    }
  }, [fetchQuizzes, loadingRef]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Filter Handlers - Do NOT lose other selected filters, Reset Page to 1
  // ─────────────────────────────────────────────────────────────────────────────
  const handleBatchChange = (newBatchId: string) => {
    setFilters((prev) => ({
      ...prev,
      batchId: newBatchId === "all" ? "" : newBatchId,
      page: 1,
    }));
  };

  const handleCourseChange = (newCourseId: string) => {
    setFilters((prev) => ({
      ...prev,
      courseId: newCourseId === "all" || newCourseId === "none" ? "" : newCourseId,
      page: 1,
    }));
  };

  const handleStatusChange = (newStatus: string) => {
    setFilters((prev) => ({
      ...prev,
      status: newStatus === "all" ? "" : newStatus,
      page: 1,
    }));
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setFilters({
      search: "",
      batchId: "",
      courseId: "",
      moduleId: "",
      status: "",
      page: 1,
      limit: 10,
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Active scope helpers
  // ─────────────────────────────────────────────────────────────────────────────
  const selectedBatch = useMemo(
    () => (!filters.batchId ? null : batches.find((b) => b.id === filters.batchId) || null),
    [batches, filters.batchId]
  );

  const selectedCourse = useMemo(
    () =>
      !filters.courseId
        ? null
        : courses.find((c) => c.id === filters.courseId || c.courseId === filters.courseId) ||
          null,
    [courses, filters.courseId]
  );

  const isFilterActive =
    Boolean(filters.batchId) ||
    Boolean(filters.courseId) ||
    Boolean(filters.moduleId) ||
    Boolean(filters.status) ||
    Boolean(filters.search.trim()) ||
    filters.page > 1;

  const totalQuizzes = pagination?.total ?? quizzes.length;

  function openCreate() {
    setEditingQuiz(null);
    setFormOpen(true);
  }

  function openEdit(quiz: Quiz) {
    setEditingQuiz(quiz);
    setFormOpen(true);
  }

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Are you sure you want to delete the quiz "${title}"?`)) return;

    setDeletingId(id);
    try {
      const res = await deleteQuizApi(id);
      if (res.success) {
        toast.success(`Quiz "${title}" deleted successfully.`);
        await fetchQuizzes();
      } else {
        toast.error(res.message || "Failed to delete quiz.");
      }
    } catch (err: unknown) {
      console.error("Error deleting quiz:", err);
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Failed to delete quiz.");
    } finally {
      setDeletingId(null);
    }
  }

  if ((loading || loadingRef) && quizzes.length === 0) {
    return <PageLoader />;
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      {/* ─────────────────────────────────────────────────────────────────────────
          TOP TOOLBAR: TITLE, SEARCH, BATCH, COURSE, STATUS, CLEAR, CREATE
          ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Left Title & Subtitle */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#3A2A22]">Quizzes</h1>
          <p className="mt-1 text-sm text-[#8C7A70]">
            Create, manage and review quizzes assigned to your trainees.
          </p>
        </div>

        {/* Action Controls in One Unified Line */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full">
          {/* 1. Search Quizzes Input (Server-side debounced) */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search quizzes..."
              className="h-10 pl-9 pr-8 rounded-xl border-[#F0DED4] bg-white text-xs text-[#3A2A22] placeholder:text-[#C7B6AC]"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#B7A79D] hover:text-[#DE896A] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* 2. Batch Selector Dropdown */}
          <div className="w-44 sm:w-48 shrink-0">
            <Select
              value={filters.batchId || "all"}
              onValueChange={handleBatchChange}
              disabled={loadingRef || batches.length === 0}
            >
              <SelectTrigger className="h-10 rounded-xl border-[#F0DED4] bg-white text-xs font-semibold text-[#233047] shadow-xs focus:ring-[#DE896A]/20">
                <SelectValue placeholder={loadingRef ? "Loading batches..." : "All Batches"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {cleanDisplayString(b.batchName || b.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Course Selector Dropdown */}
          <div className="w-48 sm:w-56 shrink-0">
            <Select
              value={filters.courseId || "all"}
              onValueChange={handleCourseChange}
              disabled={loadingRef}
            >
              <SelectTrigger className="h-10 rounded-xl border-[#F0DED4] bg-white text-xs font-semibold text-[#233047] shadow-xs focus:ring-[#DE896A]/20">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id || c.courseId} value={c.id || c.courseId || ""}>
                    {cleanDisplayString(c.courseName || c.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Status Filter Dropdown */}
          <div className="w-36 shrink-0">
            <Select value={filters.status || "all"} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-10 rounded-xl border-[#F0DED4] bg-white text-xs font-semibold text-[#233047] shadow-xs focus:ring-[#DE896A]/20">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 5. Clear Filters Button */}
          {isFilterActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="h-10 rounded-xl border-[#F0DED4] bg-white px-3 text-xs text-[#8C7A70] hover:bg-[#FBECE7] hover:text-[#3A2A22] shrink-0"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          )}

          {/* 6. Create Quiz Button */}
          <Button onClick={openCreate} className="h-10 rounded-xl shadow-xs shrink-0 sm:ml-auto">
            <Plus className="mr-1.5 h-4 w-4" /> Create Quiz
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          ACTIVE CONTEXT SCOPE INDICATOR
          ───────────────────────────────────────────────────────────────────────── */}
      {(Boolean(filters.batchId) || Boolean(filters.courseId) || Boolean(filters.status) || Boolean(filters.search.trim())) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F5E2DA] bg-gradient-to-r from-[#FFFBF9] via-[#FFF6F2] to-[#FAF3EF] px-4 py-2.5 shadow-xs text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#3A2A22]">Active Scope:</span>
            {selectedBatch && (
              <Badge tone="blue" className="px-2.5 py-0.5 text-xs font-medium">
                Batch: {cleanDisplayString(selectedBatch.name || selectedBatch.batchName)}
              </Badge>
            )}
            {selectedCourse && (
              <Badge tone="orange" className="px-2.5 py-0.5 text-xs font-medium">
                Course: {cleanDisplayString(selectedCourse.name || selectedCourse.courseName)}
              </Badge>
            )}
            {filters.status && (
              <Badge tone="neutral" className="px-2.5 py-0.5 text-xs font-medium">
                Status: {filters.status.toUpperCase()}
              </Badge>
            )}
            {filters.search.trim() && (
              <Badge tone="neutral" className="px-2.5 py-0.5 text-xs font-medium">
                Search: "{filters.search.trim()}"
              </Badge>
            )}
          </div>
          <span className="text-[#8C7A70] font-medium">
            {totalQuizzes} {totalQuizzes === 1 ? "quiz" : "quizzes"} found
          </span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          LOADING STATE: 6 SKELETON CARDS IN RESPONSIVE GRID
          ───────────────────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="rounded-2xl border border-[#F0DED4] p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="mt-4 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-9 flex-1 rounded-xl" />
                <Skeleton className="h-9 w-9 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          ERROR STATE WITH RETRY
          ───────────────────────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchQuizzes}
            className="rounded-xl border-red-300 text-red-700 hover:bg-red-100"
          >
            Retry
          </Button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          EMPTY STATE
          ───────────────────────────────────────────────────────────────────────── */}
      {!loading && !error && quizzes.length === 0 && (
        <div className="rounded-2xl border border-[#F0DED4] bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FBECE7] text-[#DE896A]">
            <HelpCircle className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-[#3A2A22]">No quizzes found</h3>
          <p className="mt-1 text-sm text-[#8C7A70] max-w-md mx-auto">
            {isFilterActive
              ? "No quizzes match your selected filter criteria. Try resetting your filters."
              : "Create your first quiz for an assigned batch to test trainee understanding."}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {isFilterActive ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="h-9 rounded-xl border-[#F0DED4] text-xs text-[#8C7A70] hover:text-[#3A2A22]"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset Filters
              </Button>
            ) : (
              <Button onClick={openCreate} className="h-9 rounded-xl text-xs">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create Quiz
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          QUIZ CARDS: RESPONSIVE 3-COLUMN GRID
          ───────────────────────────────────────────────────────────────────────── */}
      {!loading && quizzes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {quizzes.map((q) => {
            const submissions = q.submissions ?? 0;
            const totalTrainees = q.totalTrainees ?? 0;
            const avgScore = q.avgScore ?? 0;
            const totalQuestions = q.totalQuestions ?? 0;
            const isPublished =
              q.status?.toLowerCase() === "published" || q.status?.toLowerCase() === "active";
            const submissionRate =
              totalTrainees > 0 ? Math.round((submissions / totalTrainees) * 100) : 0;

            const modalQuiz: Quiz = {
              id: q.id,
              title: q.title,
              courseId: q.courseId,
              batchId: q.batchId,
              moduleId: q.moduleId,
              courseName: q.courseName,
              batchName: q.batchName,
              moduleName: q.moduleName,
              questions: totalQuestions,
              totalQuestions: totalQuestions,
              submissions,
              totalTrainees,
              avgScore,
              status: isPublished ? "published" : "draft",
              fileUrl: q.fileUrl,
            };

            return (
              <Card
                key={q.id}
                className="rounded-2xl border border-[#F0DED4] shadow-xs hover:border-[#DE896A]/50 transition-colors flex flex-col justify-between"
              >
                <CardContent className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header: Icon, Title, Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A]">
                          <ClipboardList className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-sm text-[#3A2A22]" title={q.title}>
                            {q.title}
                          </p>
                          <p className="text-[11px] text-[#B7A79D] mt-0.5">
                            Created {formatDate(q.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Badge tone={isPublished ? "green" : "neutral"} className="shrink-0 text-xs">
                        {isPublished ? "Published" : "Draft"}
                      </Badge>
                    </div>

                    {/* Metadata Context: Course, Batch, Module */}
                    <div className="mt-3.5 space-y-1.5 rounded-xl bg-[#FFFBF9] border border-[#F9ECE5] p-3 text-xs">
                      <div className="flex items-center gap-1.5 text-[#3A2A22] truncate">
                        <BookOpen className="h-3.5 w-3.5 shrink-0 text-[#DE896A]" />
                        <span className="font-medium text-[#8C7A70]">Course:</span>
                        <span className="truncate font-semibold">{cleanDisplayString(q.courseName) || "Course"}</span>
                      </div>
                      {q.batchName && (
                        <div className="flex items-center gap-1.5 text-[#3A2A22] truncate">
                          <Layers className="h-3.5 w-3.5 shrink-0 text-[#DE896A]" />
                          <span className="font-medium text-[#8C7A70]">Batch:</span>
                          <span className="truncate font-semibold">{cleanDisplayString(q.batchName)}</span>
                        </div>
                      )}
                      {q.moduleName && (
                        <div className="flex items-center gap-1.5 text-[#3A2A22] truncate">
                          <FileCheck className="h-3.5 w-3.5 shrink-0 text-[#DE896A]" />
                          <span className="font-medium text-[#8C7A70]">Module:</span>
                          <span className="truncate font-semibold">{cleanDisplayString(q.moduleName)}</span>
                        </div>
                      )}
                      <div className="text-[11px] text-[#8C7A70] pt-0.5">
                        {totalQuestions} questions
                      </div>
                    </div>

                    {/* Stat Metrics: Submissions & Average Score */}
                    <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl bg-[#FFFBF9] border border-[#F9ECE5] p-2.5">
                        <p className="text-[10px] uppercase tracking-wide font-medium text-[#B7A79D]">
                          Submissions
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#3A2A22]">
                          {submissions} / {totalTrainees}
                        </p>
                        <ProgressBar value={submissionRate} className="mt-2" />
                      </div>
                      <div className="rounded-xl bg-[#FFFBF9] border border-[#F9ECE5] p-2.5">
                        <p className="text-[10px] uppercase tracking-wide font-medium text-[#B7A79D]">
                          Average Score
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#3A2A22]">
                          {isPublished ? `${avgScore}%` : "—"}
                        </p>
                        <ProgressBar value={avgScore} className="mt-2" />
                      </div>
                    </div>
                  </div>

                  {/* Actions: View Results (Primary) & Delete */}
                  <div className="mt-4 flex items-center gap-2 pt-2 border-t border-[#F5E2DA]/60">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 justify-center rounded-xl border-[#F0DED4] text-xs font-semibold text-[#3A2A22] hover:bg-[#FBECE7]"
                      onClick={() => setResultsQuiz(modalQuiz)}
                    >
                      View Results
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[#3A2A22] hover:text-[#DE896A] hover:bg-[#FBECE7] rounded-xl px-2.5"
                      onClick={() => openEdit(modalQuiz)}
                      title="Edit quiz"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl px-2.5"
                      disabled={deletingId === q.id}
                      onClick={() => handleDelete(q.id, q.title)}
                      title="Delete quiz"
                    >
                      {deletingId === q.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          PAGINATION CONTROLS
          ───────────────────────────────────────────────────────────────────────── */}
      {!loading && pagination && pagination.total > 0 && (
        <Pagination
          page={filters.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={filters.limit}
          hasPreviousPage={pagination.hasPreviousPage}
          hasNextPage={pagination.hasNextPage}
          onPageChange={handlePageChange}
          itemLabel="quizzes"
          loading={loading}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          CREATE / EDIT QUIZ MODAL
          ───────────────────────────────────────────────────────────────────────── */}
      <QuizFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        quiz={editingQuiz}
        onSuccess={fetchQuizzes}
      />

      {/* ─────────────────────────────────────────────────────────────────────────
          VIEW RESULTS DASHBOARD MODAL
          ───────────────────────────────────────────────────────────────────────── */}
      <QuizResultsModal
        open={Boolean(resultsQuiz)}
        onOpenChange={(open) => !open && setResultsQuiz(null)}
        quiz={resultsQuiz}
      />
    </div>
  );
}
