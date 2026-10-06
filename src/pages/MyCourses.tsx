import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Layers,
  Clock,
  BookOpen,
  Play,
  AlertCircle,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  getTrainerCoursesApi,
  getTrainerFiltersApi,
  TrainerCourseItem,
  CourseFilterItem,
  BatchFilterItem,
  PaginationMetadata,
} from "@/services/api";
import PageLoader from "@/components/ui/PageLoader";
import Pagination from "@/components/ui/Pagination";

import img1 from "@/assets/1.png";
import img2 from "@/assets/2.png";
import img3 from "@/assets/3.png";
import img4 from "@/assets/4.png";

// Helper to strip internal IDs and UUIDs from visible names
function cleanCourseTitle(name: string): string {
  if (!name) return "Course";
  return name
    .replace(/\s*-\s*cid-[a-zA-Z0-9_-]+/gi, "")
    .replace(/\s*-\s*[0-9a-fA-F-]{36}/gi, "")
    .replace(/^cid-[a-zA-Z0-9_-]+\s*/gi, "")
    .trim();
}

// Helper to pick matching illustration from assets
function getCourseImage(courseName: string, index: number, serverImage?: string): string {
  if (serverImage && (serverImage.startsWith("http") || serverImage.startsWith("/"))) {
    return serverImage;
  }
  const name = (courseName || "").toLowerCase();
  if (name.includes("associate") && !name.includes("developer")) return img1;
  if (name.includes("developer")) return img2;
  if (name.includes("architect")) return img3;
  if (name.includes("foundation")) return img1;
  const list = [img1, img2, img3, img4];
  return list[index % list.length];
}

// Helper to resolve level pill (top-right of card)
function getCourseLevel(courseName: string, levelStr?: string): { label: string; className: string } {
  const name = (courseName || "").toLowerCase();
  if (levelStr && !levelStr.toLowerCase().startsWith("cid-") && !levelStr.includes("-") && levelStr.trim()) {
    return {
      label: levelStr,
      className: "border-sky-200 text-sky-600 bg-sky-50/80",
    };
  }
  if (name.includes("foundation") || name.includes("associate")) {
    return {
      label: "Foundation",
      className: "border-sky-200 text-sky-600 bg-sky-50/80",
    };
  }
  if (name.includes("developer")) {
    return {
      label: "Intermediate",
      className: "border-amber-200 text-amber-700 bg-amber-50/80",
    };
  }
  if (name.includes("architect")) {
    return {
      label: "Professional",
      className: "border-purple-200 text-purple-700 bg-purple-50/80",
    };
  }
  return {
    label: "Foundation",
    className: "border-sky-200 text-sky-600 bg-sky-50/80",
  };
}

// Helper to resolve status pill (top-left of card)
function getCourseStatus(progress: number, batchCount: number): { label: string; className: string } {
  if (progress === 100) {
    return {
      label: "Completed",
      className: "border-emerald-200 text-emerald-700 bg-emerald-50/80",
    };
  }
  if (batchCount > 0 || progress > 0) {
    return {
      label: "In Progress",
      className: "border-[#FADCD1] text-[#DE896A] bg-[#FFF6F2]",
    };
  }
  return {
    label: "Scheduled",
    className: "border-slate-200 text-slate-600 bg-slate-50",
  };
}

// Helper to resolve clean course category/code tag
function getCourseCodeTag(c: TrainerCourseItem): string {
  const cleanName = cleanCourseTitle(c.name).toUpperCase();
  if (c.courseCode && !c.courseCode.toLowerCase().startsWith("cid-") && !c.courseCode.includes("-")) {
    return `${c.courseCode.toUpperCase()} · ${cleanName}`;
  }
  const acronym = cleanName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return `${acronym || "COURSE"} · ${cleanName}`;
}

// Helper to resolve course description/subtitle
function getCourseSubtitle(c: TrainerCourseItem): string {
  if (c.description && c.description.trim()) {
    return c.description.trim();
  }
  return "Comprehensive training program covering core concepts and hands-on skills";
}

export default function MyCourses() {
  const [courses, setCourses] = useState<TrainerCourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dropdown filter options loaded once via cached API
  const [filterCourses, setFilterCourses] = useState<CourseFilterItem[]>([]);
  const [filterBatches, setFilterBatches] = useState<BatchFilterItem[]>([]);

  const [searchParams, setSearchParams] = useSearchParams();

  // Search, Filter, and Pagination States initialized from URL
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("search") || "");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState(() => searchParams.get("courseId") || "all");
  const [selectedBatchFilter, setSelectedBatchFilter] = useState(() => searchParams.get("batchId") || "all");
  const [page, setPage] = useState<number>(() => Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1));
  const limit = 6;
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);

  const isFirstMountRef = useRef(true);

  // 1. Load dropdown filter options once
  useEffect(() => {
    getTrainerFiltersApi()
      .then((data) => {
        setFilterCourses(data?.courses || []);
        setFilterBatches(data?.batches || []);
      })
      .catch((err) => console.error("Failed to load course/batch filter options:", err));
  }, []);

  // 2. Debounce search query and reset page to 1
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
    if (selectedCourseFilter && selectedCourseFilter !== "all") next.set("courseId", selectedCourseFilter);
    if (selectedBatchFilter && selectedBatchFilter !== "all") next.set("batchId", selectedBatchFilter);
    if (page > 1) next.set("page", String(page));
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, selectedCourseFilter, selectedBatchFilter, page, setSearchParams]);

  // Sync external URL changes (e.g. back/forward navigation)
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    const urlCourse = searchParams.get("courseId") || "all";
    const urlBatch = searchParams.get("batchId") || "all";
    const urlPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

    if (urlSearch !== debouncedSearch) {
      setSearchQuery(urlSearch);
      setDebouncedSearch(urlSearch);
    }
    if (urlCourse !== selectedCourseFilter) {
      setSelectedCourseFilter(urlCourse);
    }
    if (urlBatch !== selectedBatchFilter) {
      setSelectedBatchFilter(urlBatch);
    }
    if (urlPage !== page) {
      setPage(urlPage);
    }
  }, [searchParams]);

  // Compute available batches for the dropdown based on selected course
  const availableBatches = useMemo(() => {
    if (selectedCourseFilter === "all") return filterBatches;
    return filterBatches.filter((b) => b.courseId === selectedCourseFilter);
  }, [filterBatches, selectedCourseFilter]);

  const handleCourseChange = (newCourseId: string) => {
    setPage(1);
    setSelectedCourseFilter(newCourseId);
    if (newCourseId !== "all" && selectedBatchFilter !== "all") {
      const batchExists = filterBatches.some(
        (b) => b.id === selectedBatchFilter && b.courseId === newCourseId
      );
      if (!batchExists) {
        setSelectedBatchFilter("all");
      }
    }
  };

  const handleBatchChange = (newBatchId: string) => {
    setPage(1);
    setSelectedBatchFilter(newBatchId);
    if (newBatchId !== "all") {
      const parentBatch = filterBatches.find((b) => b.id === newBatchId);
      if (parentBatch?.courseId) {
        setSelectedCourseFilter(parentBatch.courseId);
      }
    }
  };

  // 3. Fetch courses from backend with server-side search, filters, and pagination
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getTrainerCoursesApi({
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        courseId: selectedCourseFilter !== "all" ? selectedCourseFilter : undefined,
        batchId: selectedBatchFilter !== "all" ? selectedBatchFilter : undefined,
      });
      if (res.success && Array.isArray(res.courses)) {
        setCourses(res.courses);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setCourses([]);
      }
    } catch (err: unknown) {
      console.error("Failed to load trainer courses:", err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to load assigned courses. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, selectedCourseFilter, selectedBatchFilter]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCourseFilter !== "all" ||
    selectedBatchFilter !== "all" ||
    page > 1;

  const resetFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedCourseFilter("all");
    setSelectedBatchFilter("all");
    setPage(1);
  };

  if (loading && courses.length === 0) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#F0EAE6] bg-white p-4 shadow-xs">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C7A70]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses or batches..."
            className="w-full rounded-xl border border-[#F0EAE6] bg-[#FFFBF9] pl-10 pr-9 py-2 text-xs font-medium text-[#233047] placeholder-[#B7A79D] focus:border-[#DE896A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8C7A70] hover:text-[#233047]"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls using shadcn Select */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Course Filter */}
          <div className="w-[180px]">
            <Select value={selectedCourseFilter} onValueChange={handleCourseChange}>
              <SelectTrigger className="h-9 rounded-xl border-[#F0EAE6] bg-[#FFFBF9] text-xs font-medium text-[#233047] hover:border-[#DE896A]/40 focus:ring-[#DE896A]/20">
                <SelectValue placeholder="Filter by Course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses ({filterCourses.length})</SelectItem>
                {filterCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {cleanCourseTitle(c.courseName || c.name || "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Batch Filter */}
          <div className="w-[180px]">
            <Select value={selectedBatchFilter} onValueChange={handleBatchChange}>
              <SelectTrigger className="h-9 rounded-xl border-[#F0EAE6] bg-[#FFFBF9] text-xs font-medium text-[#233047] hover:border-[#DE896A]/40 focus:ring-[#DE896A]/20">
                <SelectValue placeholder="Filter by Batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches ({availableBatches.length})</SelectItem>
                {availableBatches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.batchName || b.name || ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="rounded-xl border border-[#FADCD1] bg-[#FFF6F2] px-3 py-2 text-xs font-semibold text-[#DE896A] hover:bg-[#FCEEE8] transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-[#F0EAE6] bg-white p-6 shadow-sm shadow-black/[0.02] animate-pulse space-y-4"
            >
              <div className="flex justify-between">
                <div className="h-6 w-24 rounded-full bg-[#FAF7F5]" />
                <div className="h-6 w-24 rounded-full bg-[#FAF7F5]" />
              </div>
              <div className="mx-auto h-40 w-40 rounded-xl bg-[#FAF7F5]" />
              <div className="space-y-2">
                <div className="h-4 w-48 rounded bg-[#FAF7F5]" />
                <div className="h-6 w-3/4 rounded bg-[#FAF7F5]" />
                <div className="h-4 w-full rounded bg-[#FAF7F5]" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <p className="mt-2 text-sm font-medium text-red-800">{error}</p>
          <div className="mt-4 flex justify-center">
            <button
              onClick={fetchCourses}
              className="inline-flex items-center gap-2 rounded-xl bg-[#DE896A] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#c97455] transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        </div>
      ) : courses.length === 0 ? (
        hasActiveFilters ? (
          <div className="rounded-2xl border border-[#F0EAE6] bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7F5] text-[#DE896A]">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#233047]">No matching courses found.</h3>
            <p className="mt-1 text-xs text-[#8C7A70]">
              Try adjusting your search query or filter options.
            </p>
            <div className="mt-4 flex justify-center">
              <button
                onClick={resetFilters}
                className="rounded-xl bg-[#DE896A] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#C87556] transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#F0EAE6] bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7F5] text-[#DE896A]">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#233047]">No assigned courses found.</h3>
            <p className="mt-1 text-xs text-[#8C7A70]">
              You have not been assigned to any courses yet. Please contact your system administrator.
            </p>
          </div>
        )
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {courses.map((c, idx) => {
            const courseBatches = c.batches || [];
            const progress = Number(c.progress || 0);
            const status = getCourseStatus(progress, courseBatches.length);
            const level = getCourseLevel(c.name, c.level);
            const imageSrc = getCourseImage(c.name, idx, c.image);
            const codeTag = getCourseCodeTag(c);
            const cleanTitle = cleanCourseTitle(c.name);
            const subtitle = getCourseSubtitle(c);

            return (
              <div
                key={c.id}
                className="flex flex-col justify-between rounded-2xl border border-[#F0EAE6] bg-white p-5 shadow-sm shadow-black/[0.03] transition-all duration-200 hover:shadow-md"
              >
                <div>
                  {/* Top Bar: Status pill (left) & Level pill (right) */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold ${level.className}`}
                    >
                      {level.label}
                    </span>
                  </div>

                  {/* Centered Illustration Image from assets */}
                  <div className="my-3 flex h-48 w-full items-center justify-center overflow-hidden">
                    <img
                      src={imageSrc}
                      alt={cleanTitle}
                      className="h-full w-auto max-h-48 object-contain transition-transform duration-200 hover:scale-105"
                    />
                  </div>

                  {/* Clean Course Title (NO raw IDs) */}
                  <h3 className="mt-2 text-lg font-bold text-[#233047] leading-snug line-clamp-1">
                    {cleanTitle}
                  </h3>

                  {/* Course Subtitle Description */}
                  <p className="mt-1 text-xs text-[#8C7A70] line-clamp-2 min-h-[32px]">
                    {subtitle}
                  </p>

                  {/* Metadata Row */}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-[#8C7A70]">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-[#DE896A]" />
                      {c.domains || 0} modules
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-[#DE896A]" />
                      {c.hours || "4"} hrs
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-[#DE896A]" />
                      {courseBatches.length} {courseBatches.length === 1 ? "batch" : "batches"}
                    </span>
                  </div>

                  {/* Progress Bar Section */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-[#8C7A70]">Progress</span>
                      <span className="font-bold text-[#233047]">{progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#F5EBE6] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          progress === 100 ? "bg-emerald-500" : "bg-[#DE896A]"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Action Button (No embedded batch table) */}
                <div className="mt-5 pt-4 border-t border-[#F0EAE6] flex justify-end">
                  <Link to={`/content/modules?courseId=${c.id}`} className="w-full sm:w-auto">
                    <Button
                      size="sm"
                      className="w-full sm:w-auto bg-[#DE896A] hover:bg-[#C87556] text-white flex items-center justify-center gap-1.5 text-xs px-5 py-2.5 rounded-xl font-semibold shadow-xs transition-all"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" /> Manage Content
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
          </div>

          {/* Pagination Controls */}
          {!loading && pagination && pagination.total > 0 && (
            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={limit}
              hasPreviousPage={pagination.hasPreviousPage}
              hasNextPage={pagination.hasNextPage}
              onPageChange={setPage}
              itemLabel="courses"
              loading={loading}
            />
          )}
        </div>
      )}
    </div>
  );
}
