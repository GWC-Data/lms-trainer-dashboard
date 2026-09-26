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
  getQuizzesApi,
  deleteQuizApi,
  getTrainerFiltersApi,
  type BackendQuizItem,
  type BatchFilterItem,
  type CourseFilterItem,
} from "@/services/api";
import type { Quiz } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

export default function Quizzes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlBatchId = searchParams.get("batchId") || "";
  const urlCourseId = searchParams.get("courseId") || "";
  const urlStatus = searchParams.get("status") || "all";
  const urlSearch = searchParams.get("search") || "";

  // Reference data
  const [batches, setBatches] = useState<BatchFilterItem[]>([]);
  const [courses, setCourses] = useState<CourseFilterItem[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);

  // Filter states
  const [selectedBatchId, setSelectedBatchId] = useState<string>(urlBatchId || "all");
  const [selectedCourseId, setSelectedCourseId] = useState<string>(urlCourseId || "all");
  const [selectedStatus, setSelectedStatus] = useState<string>(urlStatus || "all");
  const [searchQuery, setSearchQuery] = useState(urlSearch);

  // Data states
  const [quizzes, setQuizzes] = useState<BackendQuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & actions
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [resultsQuiz, setResultsQuiz] = useState<Quiz | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Parallel Load: Lightweight Batches & Courses Filters (Once on mount)
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

        // Reconcile initial selections with URL query params
        if (urlBatchId && batchesRes.some((b) => b.id === urlBatchId)) {
          setSelectedBatchId(urlBatchId);
          const found = batchesRes.find((b) => b.id === urlBatchId);
          const targetCourseId = found?.courseId;
          if (targetCourseId) {
            setSelectedCourseId(targetCourseId);
          } else {
            setSelectedCourseId("none");
          }
        } else if (urlCourseId && coursesRes.some((c) => c.id === urlCourseId)) {
          setSelectedCourseId(urlCourseId);
          setSelectedBatchId("all");
        }
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

  // Sync search input with URL
  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Canonical Batch → Course Resolution
  // ─────────────────────────────────────────────────────────────────────────────
  const selectedBatch = useMemo(
    () => (selectedBatchId === "all" ? null : batches.find((b) => b.id === selectedBatchId) || null),
    [batches, selectedBatchId]
  );

  const selectedCourse = useMemo(() => {
    if (selectedCourseId === "all" || selectedCourseId === "none") return null;
    return courses.find((c) => c.id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  // Dynamically filter available batches by selected course locally
  const availableBatches = useMemo(() => {
    if (selectedCourseId === "all" || selectedCourseId === "none" || !selectedCourseId) {
      return batches;
    }
    return batches.filter((b) => b.courseId === selectedCourseId);
  }, [batches, selectedCourseId]);

  const batchResolvedCourseName = useMemo(() => {
    if (!selectedBatch) return null;
    const targetCourseId = selectedBatch.courseId;
    if (targetCourseId) {
      const match = courses.find((c) => c.id === targetCourseId);
      if (match?.name) return cleanDisplayString(match.name);
    }
    return null;
  }, [selectedBatch, courses]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Fetch Quizzes (Parallel / Scoped)
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchQuizzes = useCallback(async () => {
    if (selectedCourseId === "none") {
      setQuizzes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getQuizzesApi({
        courseId:
          selectedCourseId && selectedCourseId !== "all" && selectedCourseId !== "none"
            ? selectedCourseId
            : undefined,
        batchId: selectedBatchId && selectedBatchId !== "all" ? selectedBatchId : undefined,
        status: selectedStatus && selectedStatus !== "all" ? selectedStatus : undefined,
      });
      setQuizzes(data);
    } catch (err: any) {
      console.error("Failed to load quizzes:", err);
      setError("Unable to load quizzes. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId, selectedBatchId, selectedStatus]);

  useEffect(() => {
    if (!loadingRef) {
      fetchQuizzes();
    }
  }, [selectedBatchId, selectedCourseId, selectedStatus, loadingRef, fetchQuizzes]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Filter Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleBatchChange = (newBatchId: string) => {
    setSelectedBatchId(newBatchId);
    if (newBatchId === "all") {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("batchId");
        return next;
      });
    } else {
      const found = batches.find((b) => b.id === newBatchId);
      const targetCourseId = found?.courseId;
      if (targetCourseId) {
        setSelectedCourseId(targetCourseId);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set("batchId", newBatchId);
          next.set("courseId", targetCourseId);
          return next;
        });
      } else {
        setSelectedCourseId("none");
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set("batchId", newBatchId);
          next.delete("courseId");
          return next;
        });
      }
    }
  };

  const handleCourseChange = (newCourseId: string) => {
    setSelectedCourseId(newCourseId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newCourseId === "all") {
        next.delete("courseId");
      } else {
        next.set("courseId", newCourseId);
      }
      return next;
    });

    // If current batch does not belong to this new course, reset batch to all
    if (newCourseId !== "all" && newCourseId !== "none" && selectedBatchId !== "all") {
      const currentBatch = batches.find((b) => b.id === selectedBatchId);
      if (currentBatch && currentBatch.courseId && currentBatch.courseId !== newCourseId) {
        setSelectedBatchId("all");
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("batchId");
          return next;
        });
      }
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newStatus === "all") {
        next.delete("status");
      } else {
        next.set("status", newStatus);
      }
      return next;
    });
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val.trim()) {
        next.set("search", val.trim());
      } else {
        next.delete("search");
      }
      return next;
    });
  };

  const handleClearFilters = () => {
    setSelectedBatchId("all");
    setSelectedCourseId("all");
    setSelectedStatus("all");
    setSearchQuery("");
    setSearchParams({});
  };

  // Client-side search filtering on quiz title / course / batch / module
  const filteredQuizzes = useMemo(() => {
    if (!searchQuery.trim()) return quizzes;
    const q = searchQuery.toLowerCase().trim();
    return quizzes.filter(
      (quiz) =>
        quiz.title?.toLowerCase().includes(q) ||
        quiz.courseName?.toLowerCase().includes(q) ||
        quiz.batchName?.toLowerCase().includes(q) ||
        quiz.moduleName?.toLowerCase().includes(q)
    );
  }, [quizzes, searchQuery]);

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
    } catch (err: any) {
      console.error("Error deleting quiz:", err);
      toast.error(err?.response?.data?.message || "Failed to delete quiz.");
    } finally {
      setDeletingId(null);
    }
  }

  const isFilterActive =
    selectedBatchId !== "all" ||
    selectedCourseId !== "all" ||
    selectedStatus !== "all" ||
    Boolean(searchQuery.trim());

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
          {/* 1. Search Quizzes Input */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search quizzes..."
              className="h-10 pl-9 pr-8 rounded-xl border-[#F0DED4] bg-white text-xs text-[#3A2A22] placeholder:text-[#C7B6AC]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#B7A79D] hover:text-[#DE896A] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* 2. Batch Selector Dropdown */}
          <div className="w-44 sm:w-48 shrink-0">
            <Select
              value={selectedBatchId}
              onValueChange={handleBatchChange}
              disabled={loadingRef || availableBatches.length === 0}
            >
              <SelectTrigger className="h-10 rounded-xl border-[#F0DED4] bg-white text-xs font-semibold text-[#233047] shadow-xs focus:ring-[#DE896A]/20">
                <SelectValue placeholder={loadingRef ? "Loading batches..." : "All Batches"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {availableBatches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {cleanDisplayString(b.name || (b as any).batchName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Course Selector Dropdown */}
          <div className="w-48 sm:w-56 shrink-0">
            <Select
              value={selectedCourseId}
              onValueChange={handleCourseChange}
              disabled={loadingRef}
            >
              <SelectTrigger
                className="h-10 rounded-xl border-[#F0DED4] bg-white text-xs font-semibold text-[#233047] shadow-xs focus:ring-[#DE896A]/20"
              >
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id || (c as any).courseId} value={c.id || (c as any).courseId}>
                    {cleanDisplayString(c.name || (c as any).courseName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Status Filter Dropdown */}
          <div className="w-36 shrink-0">
            <Select value={selectedStatus} onValueChange={handleStatusChange}>
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
      {(selectedBatchId !== "all" || (selectedCourseId !== "all" && selectedCourseId !== "none")) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F5E2DA] bg-gradient-to-r from-[#FFFBF9] via-[#FFF6F2] to-[#FAF3EF] px-4 py-2.5 shadow-xs text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#3A2A22]">Active Scope:</span>
            {selectedBatch && (
              <Badge tone="blue" className="px-2.5 py-0.5 text-xs font-medium">
                Batch: {cleanDisplayString(selectedBatch.name || (selectedBatch as any).batchName)}
              </Badge>
            )}
            {batchResolvedCourseName || selectedCourse ? (
              <Badge tone="orange" className="px-2.5 py-0.5 text-xs font-medium">
                Course: {batchResolvedCourseName || cleanDisplayString((selectedCourse as any)?.courseName || (selectedCourse as any)?.name)}
              </Badge>
            ) : selectedCourseId === "none" ? (
              <Badge tone="red" className="px-2.5 py-0.5 text-xs font-medium">
                No course assigned to batch
              </Badge>
            ) : null}
          </div>
          <span className="text-[#8C7A70] font-medium">
            {filteredQuizzes.length} {filteredQuizzes.length === 1 ? "quiz" : "quizzes"} found
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
      {!loading && !error && filteredQuizzes.length === 0 && (
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
      {!loading && filteredQuizzes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQuizzes.map((q) => {
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
