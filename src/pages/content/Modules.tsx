import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Boxes,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Clock,
  Layers,
  FileText,
  Sparkles,
  RotateCcw,
  Users,
  Search,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  getModulesApi,
  getTrainerFiltersApi,
  type BackendModuleItem,
  type BatchFilterItem,
  type CourseFilterItem,
  type PaginationMetadata,
} from "@/services/api";
import AddModuleModal from "@/components/forms/AddModuleModal";
import { cn } from "@/lib/utils";
import PageLoader from "@/components/ui/PageLoader";
import Pagination from "@/components/ui/Pagination";

// Helper to strip internal IDs and UUIDs from visible names
function cleanDisplayString(name?: string | null): string {
  if (!name) return "";
  return name
    .replace(/\s*-\s*cid-[a-zA-Z0-9_-]+/gi, "")
    .replace(/\s*-\s*[0-9a-fA-F-]{36}/gi, "")
    .replace(/^cid-[a-zA-Z0-9_-]+\s*/gi, "")
    .replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/gi, "")
    .trim();
}

function formatUpdatedDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "recently";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Modules() {
  const [modules, setModules] = useState<BackendModuleItem[]>([]);
  const [batches, setBatches] = useState<BatchFilterItem[]>([]);
  const [courses, setCourses] = useState<CourseFilterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRef, setLoadingRef] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlCourseId = searchParams.get("courseId") || "";
  const urlBatchId = searchParams.get("batchId") || "";
  const urlSearch = searchParams.get("search") || "";
  const urlPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const [selectedBatchId, setSelectedBatchId] = useState<string>(urlBatchId || "all");
  const [selectedCourseId, setSelectedCourseId] = useState<string>(urlCourseId || "all");
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const [page, setPage] = useState<number>(urlPage);
  const limit = 10;
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);

  const isFirstMountRef = useRef(true);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Parallel Load: Lightweight Batches & Courses Filters (Once on mount)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function loadReferenceData() {
      try {
        setLoadingRef(true);
        const { courses: coursesRes, batches: batchesRes } = await getTrainerFiltersApi().catch((err) => {
          console.warn("Failed to load trainer filters:", err);
          return { courses: [] as CourseFilterItem[], batches: [] as BatchFilterItem[] };
        });

        if (!mounted) return;

        setBatches(batchesRes);
        setCourses(coursesRes);

        // Reconcile initial selections with URL search params
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
        console.error("Failed to load reference data for modules:", err);
      } finally {
        if (mounted) setLoadingRef(false);
      }
    }

    loadReferenceData();
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
    if (selectedBatchId && selectedBatchId !== "all") next.set("batchId", selectedBatchId);
    if (selectedCourseId && selectedCourseId !== "all" && selectedCourseId !== "none") {
      next.set("courseId", selectedCourseId);
    }
    if (page > 1) next.set("page", String(page));
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, selectedBatchId, selectedCourseId, page, setSearchParams]);

  // Sync external URL changes
  useEffect(() => {
    const s = searchParams.get("search") || "";
    const c = searchParams.get("courseId") || "all";
    const b = searchParams.get("batchId") || "all";
    const p = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

    if (s !== debouncedSearch) {
      setSearchQuery(s);
      setDebouncedSearch(s);
    }
    if (c !== selectedCourseId) {
      setSelectedCourseId(c);
    }
    if (b !== selectedBatchId) {
      setSelectedBatchId(b);
    }
    if (p !== page) {
      setPage(p);
    }
  }, [searchParams]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Canonical Batch → Course Resolution
  // ─────────────────────────────────────────────────────────────────────────────
  const selectedBatch = useMemo(
    () => (selectedBatchId === "all" ? null : batches.find((b) => b.id === selectedBatchId) || null),
    [batches, selectedBatchId]
  );

  const selectedCourse = useMemo(() => {
    if (selectedCourseId === "all" || selectedCourseId === "none") return null;
    return courses.find((c) => c.id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  const batchResolvedCourseName = useMemo(() => {
    if (!selectedBatch) return null;
    const targetCourseId = selectedBatch.courseId;
    if (targetCourseId) {
      const match = courses.find((c) => c.id === targetCourseId);
      if (match?.name) return cleanDisplayString(match.name);
    }
    return null;
  }, [selectedBatch, courses]);

  // Dynamically filter available batches by selected course locally
  const availableBatches = useMemo(() => {
    if (selectedCourseId === "all" || selectedCourseId === "none" || !selectedCourseId) {
      return batches;
    }
    return batches.filter((b) => b.courseId === selectedCourseId);
  }, [batches, selectedCourseId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Fetch Modules with Server-Side Search, Filter, and Pagination
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchModules = useCallback(async () => {
    if (selectedCourseId === "none") {
      setModules([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await getModulesApi({
        courseId: selectedCourseId && selectedCourseId !== "all" ? selectedCourseId : undefined,
        batchId: selectedBatchId && selectedBatchId !== "all" ? selectedBatchId : undefined,
        search: debouncedSearch.trim() || undefined,
        page,
        limit,
      });

      if (res.success && Array.isArray(res.modules)) {
        setModules(res.modules);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setModules([]);
      }
    } catch (err: any) {
      console.error("Failed to load modules:", err);
      setError(err?.response?.data?.message || "Failed to load modules for the selected filter.");
      setModules([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId, selectedBatchId, debouncedSearch, page, limit]);

  useEffect(() => {
    if (!loadingRef) {
      fetchModules();
    }
  }, [fetchModules, loadingRef]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Filter Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleBatchChange = (newBatchId: string) => {
    setPage(1);
    setSelectedBatchId(newBatchId);
    if (newBatchId !== "all") {
      const found = batches.find((b) => b.id === newBatchId);
      const targetCourseId = found?.courseId;
      if (targetCourseId) {
        setSelectedCourseId(targetCourseId);
      }
    }
  };

  const handleCourseChange = (newCourseId: string) => {
    setPage(1);
    setSelectedCourseId(newCourseId);

    // If current batch does not belong to this new course, reset batch to all
    if (newCourseId !== "all" && newCourseId !== "none" && selectedBatchId !== "all") {
      const currentBatch = batches.find((b) => b.id === selectedBatchId);
      if (currentBatch && currentBatch.courseId && currentBatch.courseId !== newCourseId) {
        setSelectedBatchId("all");
      }
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedBatchId("all");
    setSelectedCourseId("all");
    setPage(1);
  };

  const handleModuleClick = (moduleId: string, moduleCourseId?: string) => {
    const params = new URLSearchParams();
    const effectiveCourseId =
      selectedCourseId && selectedCourseId !== "all" && selectedCourseId !== "none"
        ? selectedCourseId
        : moduleCourseId;
    if (effectiveCourseId && effectiveCourseId !== "all" && effectiveCourseId !== "none") {
      params.set("courseId", effectiveCourseId);
    }
    params.set("moduleId", moduleId);
    if (selectedBatchId && selectedBatchId !== "all") {
      params.set("batchId", selectedBatchId);
    }
    navigate(`/content/documents?${params.toString()}`);
  };

  const cleanTitle = selectedBatch
    ? cleanDisplayString(selectedBatch.name || (selectedBatch as any).batchName)
    : selectedCourse
    ? cleanDisplayString(selectedCourse.name || (selectedCourse as any).courseName)
    : "All Course Modules";

  const courseDesc =
    (selectedCourse as any)?.description?.trim() ||
    (selectedBatch
      ? `Modules assigned to ${cleanDisplayString(selectedBatch.name || (selectedBatch as any).batchName)} · ${batchResolvedCourseName || "No course"}`
      : "Browse modules for your assigned curriculum and manage teaching materials.");

  if ((loading || loadingRef) && modules.length === 0) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      {/* ─────────────────────────────────────────────────────────────────────────
          HEADER & FILTER TOOLBAR
          ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#3A2A22]">Modules</h1>
          <p className="mt-1 text-sm text-[#8C7A70]">
            Browse modules for your assigned courses and batches, and manage teaching materials.
          </p>
        </div>

        {/* Responsive Toolbar with Search, Batch & Course Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C7A70]" />
            <Input
              type="text"
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-10 rounded-xl border-[#F0DED4] bg-white text-xs font-medium text-[#233047] placeholder:text-[#8C7A70] focus:ring-[#DE896A]/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7A70] hover:text-[#3A2A22]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Batch Selector Dropdown */}
          <div className="w-full sm:w-48">
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
                    {cleanDisplayString(b.batchName || b.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Course Selector Dropdown */}
          <div className="w-full sm:w-56">
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
                    {cleanDisplayString(c.courseName || c.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          {(searchQuery || selectedBatchId !== "all" || selectedCourseId !== "all" || page > 1) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="h-10 rounded-xl border-[#F0DED4] bg-white px-3 text-xs text-[#8C7A70] hover:bg-[#FBECE7] hover:text-[#3A2A22]"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Clear Filters
            </Button>
          )}

          <Button onClick={() => setModalOpen(true)} className="h-10 rounded-xl shadow-xs">
            <Plus className="mr-1.5 h-4 w-4" /> New Module
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          CONTEXT HERO BANNER
          ───────────────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-[#F5E2DA] bg-gradient-to-r from-[#FFFBF9] via-[#FFF6F2] to-[#FAF3EF] p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="orange">
                <Sparkles className="mr-1 h-3 w-3" />
                {selectedBatch ? "BATCH SCOPED" : selectedCourse ? "COURSE SCOPED" : "ALL MODULES"}
              </Badge>

              {selectedBatch && (
                <Badge tone="neutral">
                  <Users className="mr-1 h-3 w-3" />
                  BATCH: {cleanDisplayString(selectedBatch.batchName || selectedBatch.name)}
                </Badge>
              )}

              {batchResolvedCourseName ? (
                <Badge tone="neutral">COURSE: {cleanDisplayString(batchResolvedCourseName)}</Badge>
              ) : selectedCourse ? (
                <Badge tone="neutral">
                  COURSE: {cleanDisplayString(selectedCourse.courseName || selectedCourse.name)}
                </Badge>
              ) : selectedBatch ? (
                <Badge tone="red">NO COURSE ASSIGNED</Badge>
              ) : null}
            </div>

            <h2 className="text-xl font-bold text-[#233047] truncate">{cleanTitle}</h2>
            <p className="text-xs text-[#8C7A70] line-clamp-2 max-w-2xl">{courseDesc}</p>
          </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-xl border border-[#F5E2DA] bg-white px-3 py-1.5 text-xs font-semibold text-[#233047] shadow-2xs">
                <Layers className="h-3.5 w-3.5 text-[#DE896A]" />
                {modules.length} {modules.length === 1 ? "Module" : "Modules"}
              </div>
              {(selectedCourse as any)?.hours && (
                <div className="flex items-center gap-1.5 rounded-xl border border-[#F5E2DA] bg-white px-3 py-1.5 text-xs font-semibold text-[#233047] shadow-2xs">
                  <Clock className="h-3.5 w-3.5 text-[#DE896A]" />
                  {(selectedCourse as any).hours} hrs
                </div>
              )}
            </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          MODULES LIST CARD
          ───────────────────────────────────────────────────────────────────────── */}
      <Card className="rounded-2xl border-[#F5E2DA] shadow-xs overflow-hidden">
        <CardContent className="divide-y divide-[#F5E2DA] p-0">
          {loading ? (
            <div className="divide-y divide-[#F5E2DA]">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#FAF7F5]" />
                    <div className="space-y-2">
                      <div className="h-4 w-48 rounded bg-[#FAF7F5]" />
                      <div className="h-3 w-32 rounded bg-[#FAF7F5]" />
                    </div>
                  </div>
                  <div className="h-6 w-20 rounded-full bg-[#FAF7F5]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <p className="mt-2 text-sm font-medium text-red-800">{error}</p>
              <div className="mt-4 flex justify-center">
                <button
                  onClick={fetchModules}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#DE896A] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#c97455] transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            </div>
          ) : selectedCourseId === "none" ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-[#233047]">
                No course assigned to this batch
              </h3>
              <p className="mt-1 text-xs text-[#8C7A70]">
                This batch does not currently have an active course linked in the curriculum catalog.
              </p>
            </div>
          ) : modules.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7F5] text-[#DE896A]">
                <Boxes className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-[#233047]">
                No modules found for this selection.
              </h3>
              <p className="mt-1 text-xs text-[#8C7A70]">
                Add a new module to begin organizing lessons and course materials.
              </p>
              <div className="mt-4 flex justify-center">
                <Button
                  onClick={() => setModalOpen(true)}
                  size="sm"
                  className="rounded-xl shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add First Module
                </Button>
              </div>
            </div>
          ) : (
            modules.map((m, idx) => {
              const deliveryMode = m.deliveryMode || "online";
              const moduleTitle = m.moduleName || m.title || `Module ${idx + 1}`;

              return (
                <div
                  key={m.id}
                  onClick={() => handleModuleClick(m.id, m.courseId)}
                  className="group flex cursor-pointer items-center justify-between gap-4 p-4 transition-all duration-150 hover:bg-[#FFFBF9] hover:pl-5"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleModuleClick(m.id, m.courseId);
                    }
                  }}
                  title="Click to view module materials"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A] transition-transform duration-150 group-hover:scale-105 group-hover:bg-[#DE896A] group-hover:text-white">
                      <Boxes className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#233047] group-hover:text-[#DE896A] transition-colors">
                        {moduleTitle}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#8C7A70] mt-0.5">
                        <span className="flex items-center gap-1 font-medium">
                          <FileText className="h-3 w-3 text-[#DE896A]" />
                          {m.lessonsCount} {m.lessonsCount === 1 ? "lesson" : "lessons"}
                        </span>
                        <span>·</span>
                        <span>Updated {formatUpdatedDate(m.updatedAt)}</span>
                        {m.courseName && (
                          <>
                            <span>·</span>
                            <span className="text-[#B7A79D]">{cleanDisplayString(m.courseName)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {((m.deliveryMode || "online").toLowerCase().trim() === "both"
                        ? ["online", "offline"]
                        : [(m.deliveryMode || "online").toLowerCase().trim()]
                      ).map((dm) => (
                        <Badge
                          key={dm}
                          tone={dm === "online" ? "blue" : "neutral"}
                          className="capitalize text-xs font-semibold"
                        >
                          {dm}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF6F3] text-[#8C7A70] group-hover:bg-[#DE896A] group-hover:text-white transition-all">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
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
          itemLabel="modules"
        />
      )}

      <AddModuleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultBatchId={selectedBatchId !== "all" ? selectedBatchId : undefined}
        onSuccess={fetchModules}
      />
    </div>
  );
}
