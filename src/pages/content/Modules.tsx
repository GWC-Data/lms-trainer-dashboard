import { useState, useEffect, useCallback, useMemo } from "react";
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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  getModulesApi,
  getTrainerBatchFiltersApi,
  getTrainerCourseFiltersApi,
  type BackendModuleItem,
  type BatchFilterItem,
  type CourseFilterItem,
} from "@/services/api";
import AddModuleModal from "@/components/forms/AddModuleModal";
import { cn } from "@/lib/utils";
import PageLoader from "@/components/ui/PageLoader";

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

  const [selectedBatchId, setSelectedBatchId] = useState<string>(urlBatchId || "all");
  const [selectedCourseId, setSelectedCourseId] = useState<string>(urlCourseId || "all");

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Parallel Load: Lightweight Batches & Courses Filters (Once on mount)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function loadReferenceData() {
      try {
        setLoadingRef(true);
        const [batchesRes, coursesRes] = await Promise.all([
          getTrainerBatchFiltersApi().catch((err) => {
            console.warn("Failed to load trainer batch filters:", err);
            return [] as BatchFilterItem[];
          }),
          getTrainerCourseFiltersApi().catch((err) => {
            console.warn("Failed to load trainer course filters:", err);
            return [] as CourseFilterItem[];
          }),
        ]);

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
        } else if (coursesRes.length > 0 && !urlBatchId && !urlCourseId) {
          // Default to first course if neither is provided
          setSelectedCourseId(coursesRes[0].id);
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
  // 3. Fetch Modules for Selected Course
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchModules = useCallback(async () => {
    // If batch has no course assigned (orphan batch)
    if (selectedCourseId === "none") {
      setModules([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const targetCourseParam =
        selectedCourseId && selectedCourseId !== "all" ? selectedCourseId : undefined;
      const res = await getModulesApi(targetCourseParam);

      if (res.success && Array.isArray(res.modules)) {
        if (targetCourseParam) {
          setModules(res.modules.filter((m) => m.courseId === targetCourseParam));
        } else {
          setModules(res.modules);
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
  }, [selectedCourseId]);

  useEffect(() => {
    if (!loadingRef) {
      fetchModules();
    }
  }, [selectedCourseId, loadingRef, fetchModules]);

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
        setSearchParams({ batchId: newBatchId, courseId: targetCourseId });
      } else {
        setSelectedCourseId("none");
        setSearchParams({ batchId: newBatchId });
      }
    }
  };

  const handleCourseChange = (newCourseId: string) => {
    // Only changeable when selectedBatchId is "all"
    if (selectedBatchId === "all") {
      setSelectedCourseId(newCourseId);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (newCourseId === "all") {
          next.delete("courseId");
        } else {
          next.set("courseId", newCourseId);
        }
        next.delete("batchId");
        return next;
      });
    }
  };

  const handleClearFilters = () => {
    setSelectedBatchId("all");
    setSelectedCourseId("all");
    setSearchParams({});
  };

  const handleModuleClick = (moduleId: string) => {
    const params = new URLSearchParams();
    if (selectedCourseId && selectedCourseId !== "all" && selectedCourseId !== "none") {
      params.set("courseId", selectedCourseId);
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

        {/* Responsive Toolbar with Batch & Course Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Batch Selector Dropdown */}
          <div className="w-full sm:w-48">
            <Select
              value={selectedBatchId}
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
                    {cleanDisplayString(b.name || (b as any).batchName)}
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
              disabled={selectedBatchId !== "all" || loadingRef}
            >
              <SelectTrigger
                className={cn(
                  "h-10 rounded-xl border-[#F0DED4] bg-white text-xs font-semibold text-[#233047] shadow-xs focus:ring-[#DE896A]/20",
                  selectedBatchId !== "all" && "bg-gray-50/80 cursor-not-allowed opacity-90"
                )}
              >
                <SelectValue
                  placeholder={
                    selectedBatchId !== "all"
                      ? batchResolvedCourseName || "No course assigned"
                      : "All Courses"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {selectedBatchId === "all" ? (
                  <>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {cleanDisplayString(c.name || (c as any).courseName)}
                      </SelectItem>
                    ))}
                  </>
                ) : (
                  <SelectItem value={selectedCourseId || "none"}>
                    {batchResolvedCourseName || "No course assigned to this batch"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          {(selectedBatchId !== "all" || selectedCourseId !== "all") && (
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
                  BATCH: {cleanDisplayString(selectedBatch.name || (selectedBatch as any).batchName)}
                </Badge>
              )}

              {batchResolvedCourseName ? (
                <Badge tone="neutral">COURSE: {cleanDisplayString(batchResolvedCourseName)}</Badge>
              ) : selectedCourse ? (
                <Badge tone="neutral">
                  COURSE: {cleanDisplayString(selectedCourse.name || (selectedCourse as any).courseName)}
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
              const moduleTitle = m.title || m.moduleName || `Module ${idx + 1}`;

              return (
                <div
                  key={m.id}
                  onClick={() => handleModuleClick(m.id)}
                  className="group flex cursor-pointer items-center justify-between gap-4 p-4 transition-all duration-150 hover:bg-[#FFFBF9] hover:pl-5"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleModuleClick(m.id);
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
                    <Badge
                      tone={deliveryMode === "online" ? "blue" : "neutral"}
                      className="capitalize text-xs font-semibold"
                    >
                      {deliveryMode}
                    </Badge>
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

      <AddModuleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultBatchId={selectedBatchId !== "all" ? selectedBatchId : undefined}
        onSuccess={fetchModules}
      />
    </div>
  );
}
