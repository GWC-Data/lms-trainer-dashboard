import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Layers,
  Calendar,
  Users,
  Laptop,
  MapPin,
  Search,
  X,
  AlertCircle,
  RefreshCw,
  BookOpen,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import {
  getTrainerBatchesApi,
  getTrainerCoursesApi,
  BackendBatchItem,
  TrainerCourseItem,
} from "@/services/api";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "Not scheduled";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

function cleanDisplayString(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/\s*-\s*cid-[a-zA-Z0-9_-]+/gi, "")
    .replace(/\s*-\s*[0-9a-fA-F-]{36}/gi, "")
    .replace(/^cid-[a-zA-Z0-9_-]+\s*/gi, "")
    .trim();
}

export default function Batches() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<BackendBatchItem[]>([]);
  const [courses, setCourses] = useState<TrainerCourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("all");
  const [selectedModeFilter, setSelectedModeFilter] = useState("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [batchesRes, coursesRes] = await Promise.all([
        getTrainerBatchesApi(),
        getTrainerCoursesApi().catch(() => ({ success: true, courses: [] })),
      ]);

      setBatches(Array.isArray(batchesRes) ? batchesRes : []);
      if (coursesRes.success && Array.isArray(coursesRes.courses)) {
        setCourses(coursesRes.courses);
      } else {
        setCourses([]);
      }
    } catch (err: any) {
      console.error("Failed to load batches:", err);
      setError(err?.response?.data?.message || "Failed to load batches. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Map courses by ID for quick resolution
  const courseMap = useMemo(() => {
    const map = new Map<string, TrainerCourseItem>();
    courses.forEach((c) => {
      if (c.id) map.set(c.id, c);
    });
    return map;
  }, [courses]);

  // Filtered batches based on search, course, and delivery mode
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      // 1. Course filter
      if (selectedCourseFilter !== "all" && b.courseId !== selectedCourseFilter) {
        return false;
      }

      // 2. Mode filter
      const mode = (b.deliveryMode || "").toLowerCase();
      if (selectedModeFilter !== "all" && mode !== selectedModeFilter) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const batchName = (b.batchName || b.name || "").toLowerCase();
        const courseName = (b.course?.courseName || courseMap.get(b.courseId || "")?.name || "").toLowerCase();
        if (!batchName.includes(q) && !courseName.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [batches, selectedCourseFilter, selectedModeFilter, searchQuery, courseMap]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCourseFilter !== "all" ||
    selectedModeFilter !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCourseFilter("all");
    setSelectedModeFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#233047]">Batches</h1>
        <p className="mt-1 text-sm text-[#8C7A70]">
          Manage and review all training batches and allocated courses assigned to you.
        </p>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#F0EAE6] bg-white p-4 shadow-xs">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C7A70]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search batches or allocated course..."
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
          <div className="w-52">
            <Select value={selectedCourseFilter} onValueChange={setSelectedCourseFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses ({courses.length})</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode Filter */}
          <div className="w-36">
            <Select value={selectedModeFilter} onValueChange={setSelectedModeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Delivery Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters */}
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

      {/* Batches Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-[#F0EAE6] bg-white p-5 shadow-xs animate-pulse space-y-4"
            >
              <div className="flex justify-between">
                <div className="h-5 w-36 rounded bg-[#FAF7F5]" />
                <div className="h-5 w-16 rounded-full bg-[#FAF7F5]" />
              </div>
              <div className="h-4 w-48 rounded bg-[#FAF7F5]" />
              <div className="h-20 rounded-xl bg-[#FAF7F5]" />
              <div className="h-8 rounded-xl bg-[#FAF7F5]" />
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
              onClick={fetchData}
              className="inline-flex items-center gap-2 rounded-xl bg-[#DE896A] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#C87556] transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        </div>
      ) : batches.length === 0 ? (
        <div className="rounded-2xl border border-[#F0EAE6] bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7F5] text-[#DE896A]">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-bold text-[#233047]">No batches are currently available.</h3>
          <p className="mt-1 text-xs text-[#8C7A70]">
            No batches have been assigned to your trainer profile yet.
          </p>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="rounded-2xl border border-[#F0EAE6] bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7F5] text-[#DE896A]">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-bold text-[#233047]">No matching batches found.</h3>
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredBatches.map((b) => {
            const resolvedCourse =
              b.course?.courseName
                ? b.course
                : b.courseId && courseMap.has(b.courseId)
                ? {
                    id: b.courseId,
                    courseName: courseMap.get(b.courseId)!.name,
                    courseDesc: courseMap.get(b.courseId)!.description,
                  }
                : null;

            const courseName = resolvedCourse?.courseName || null;
            const courseDesc = resolvedCourse?.courseDesc || null;
            const isOnline = (b.deliveryMode || "online").toLowerCase() === "online";
            const traineeCount = Array.isArray(b.trainees) ? b.trainees.length : 0;

            return (
              <div
                key={b.id}
                className="flex flex-col justify-between rounded-2xl border border-[#F0EAE6] bg-white p-5 shadow-xs hover:shadow-md transition-all duration-200"
              >
                <div className="space-y-3.5">
                  {/* Batch Header: Name & Mode Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-[#233047] truncate">
                        {b.batchName || b.name || "Batch"}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-[#8C7A70]">
                        <Calendar className="h-3.5 w-3.5 text-[#DE896A]" />
                        <span>
                          {formatDate(b.startDate)} &ndash; {formatDate(b.endDate)}
                        </span>
                      </div>
                    </div>
                    <Badge
                      tone={isOnline ? "blue" : "amber"}
                      className="shrink-0 scale-95 origin-top-right"
                    >
                      {isOnline ? (
                        <Laptop className="h-3 w-3 mr-1" />
                      ) : (
                        <MapPin className="h-3 w-3 mr-1" />
                      )}
                      {isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>

                  {/* Trainees Count */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#8C7A70]">
                    <Users className="h-3.5 w-3.5 text-[#DE896A]" />
                    <span>
                      {traineeCount} {traineeCount === 1 ? "trainee" : "trainees"} enrolled
                    </span>
                  </div>

                  {/* Allocated Course Card (Clickable Flow: Batch -> Course -> Modules) */}
                  <div className="rounded-xl border border-[#F0EAE6] bg-[#FFFBF9] p-3 transition-colors">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#B7A79D] mb-1">
                      <BookOpen className="h-3 w-3 text-[#DE896A]" />
                      <span>Allocated Course</span>
                    </div>

                    {courseName && b.courseId ? (
                      <div
                        onClick={() =>
                          navigate(`/content/modules?courseId=${b.courseId}&batchId=${b.id}`)
                        }
                        className="group cursor-pointer space-y-1"
                        role="button"
                        tabIndex={0}
                        title="Click to view modules and course content"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-[#233047] group-hover:text-[#DE896A] transition-colors line-clamp-1">
                            {cleanDisplayString(courseName)}
                          </p>
                          <ArrowRight className="h-3.5 w-3.5 text-[#DE896A] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        {courseDesc && (
                          <p className="text-[11px] text-[#8C7A70] line-clamp-2">
                            {courseDesc}
                          </p>
                        )}
                        <p className="pt-1 text-[11px] font-semibold text-[#DE896A] group-hover:underline inline-flex items-center gap-1">
                          View Modules &rarr;
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs font-medium text-[#8C7A70] italic">
                        No course assigned
                      </p>
                    )}
                  </div>
                </div>

                {/* Batch Footer Actions */}
                <div className="mt-4 pt-3 border-t border-[#F0EAE6] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link
                      to="/trainees"
                      state={{ batchId: b.id }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#8C7A70] hover:text-[#233047] transition-colors"
                    >
                      <Users className="h-3.5 w-3.5" /> Trainees
                    </Link>
                    {!isOnline && (
                      <Link
                        to="/attendance"
                        state={{ batchId: b.id }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#8C7A70] hover:text-[#233047] transition-colors ml-2"
                      >
                        <UserCheck className="h-3.5 w-3.5" /> Attendance
                      </Link>
                    )}
                  </div>

                  {b.courseId && (
                    <Link to={`/content/modules?courseId=${b.courseId}&batchId=${b.id}`}>
                      <Button
                        size="sm"
                        className="bg-[#DE896A] hover:bg-[#C87556] text-white text-xs px-3 py-1.5 rounded-xl font-semibold shadow-xs"
                      >
                        Course Content
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
