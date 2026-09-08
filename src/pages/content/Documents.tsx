import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Upload,
  FileText,
  Download,
  Search,
  X,
  Filter,
  ArrowLeft,
  Boxes,
  Sparkles,
  Layers,
  RotateCcw,
  Users,
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
import UploadDocumentModal from "@/components/forms/UploadDocumentModal";
import { triggerDownload } from "@/lib/utils";
import { formatFileSize } from "@/components/ui/FileDropzone";
import {
  getDocumentsApi,
  getTrainerBatchesApi,
  getTrainerCoursesApi,
  type BackendDocumentItem,
  type BackendBatchItem,
  type TrainerCourseItem,
} from "@/services/api";
import { cn } from "@/lib/utils";

const fileToneMap: Record<string, "red" | "blue" | "amber" | "green" | "neutral"> = {
  PDF: "red",
  DOCX: "blue",
  DOC: "blue",
  PPTX: "amber",
  PPT: "amber",
  XLSX: "green",
  XLS: "green",
  TXT: "neutral",
};

// Clean raw IDs, cid-xxxx, and UUIDs from visible strings
function cleanDisplayString(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/\s*-\s*cid-[a-zA-Z0-9_-]+/gi, "")
    .replace(/\s*-\s*[0-9a-fA-F-]{36}/gi, "")
    .replace(/^cid-[a-zA-Z0-9_-]+\s*/gi, "")
    .replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/gi, "")
    .trim();
}

function formatDate(dateStr?: string | { value?: string }): string {
  if (!dateStr) return "";
  const raw = typeof dateStr === "object" && dateStr?.value ? dateStr.value : String(dateStr);
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return String(raw);
  }
}

export default function Documents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCourseId = searchParams.get("courseId") || "";
  const urlBatchId = searchParams.get("batchId") || "";
  const moduleId = searchParams.get("moduleId") || "";
  const urlSearch = searchParams.get("search") || "";

  // Reference data
  const [batches, setBatches] = useState<BackendBatchItem[]>([]);
  const [courses, setCourses] = useState<TrainerCourseItem[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);

  // Filters
  const [selectedBatchId, setSelectedBatchId] = useState<string>(urlBatchId || "all");
  const [selectedCourseId, setSelectedCourseId] = useState<string>(urlCourseId || "all");
  const [searchQuery, setSearchQuery] = useState(urlSearch);

  // Document items
  const [documents, setDocuments] = useState<BackendDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Parallel Load: Batches & Courses
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function loadReferenceData() {
      try {
        setLoadingRef(true);
        const [batchesRes, coursesRes] = await Promise.all([
          getTrainerBatchesApi().catch((err) => {
            console.warn("Failed to load trainer batches:", err);
            return [] as BackendBatchItem[];
          }),
          getTrainerCoursesApi().catch((err) => {
            console.warn("Failed to load trainer courses:", err);
            return { courses: [] as TrainerCourseItem[] };
          }),
        ]);

        if (!mounted) return;

        setBatches(batchesRes);
        setCourses(coursesRes?.courses || []);

        if (urlBatchId && batchesRes.some((b) => b.id === urlBatchId)) {
          setSelectedBatchId(urlBatchId);
          const found = batchesRes.find((b) => b.id === urlBatchId);
          const targetCourseId = found?.courseId || found?.course?.id;
          if (targetCourseId) {
            setSelectedCourseId(targetCourseId);
          } else {
            setSelectedCourseId("none");
          }
        } else if (urlCourseId && (coursesRes?.courses || []).some((c) => c.id === urlCourseId)) {
          setSelectedCourseId(urlCourseId);
          setSelectedBatchId("all");
        }
      } catch (err) {
        console.error("Failed to load reference data for documents:", err);
      } finally {
        if (mounted) setLoadingRef(false);
      }
    }

    loadReferenceData();
    return () => {
      mounted = false;
    };
  }, [urlBatchId, urlCourseId]);

  // Sync search input when URL changes
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
    return (
      courses.find((c) => c.id === selectedCourseId) ||
      (selectedBatch?.course?.courseName
        ? {
            id: selectedCourseId,
            courseName: selectedBatch.course.courseName,
          }
        : null)
    );
  }, [courses, selectedCourseId, selectedBatch]);

  const batchResolvedCourseName = useMemo(() => {
    if (!selectedBatch) return null;
    if (selectedBatch.course?.courseName) return cleanDisplayString(selectedBatch.course.courseName);
    const targetCourseId = selectedBatch.courseId || selectedBatch.course?.id;
    if (targetCourseId) {
      const match = courses.find((c) => c.id === targetCourseId);
      if (match?.courseName) return cleanDisplayString(match.courseName);
    }
    return null;
  }, [selectedBatch, courses]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Fetch Documents
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    if (selectedCourseId === "none") {
      setDocuments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await getDocumentsApi({
        courseId:
          selectedCourseId && selectedCourseId !== "all" && selectedCourseId !== "none"
            ? selectedCourseId
            : undefined,
        moduleId: moduleId || undefined,
        batchId: selectedBatchId && selectedBatchId !== "all" ? selectedBatchId : undefined,
        search: searchQuery.trim() || undefined,
      });
      setDocuments(res.documents || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId, selectedBatchId, moduleId, searchQuery]);

  useEffect(() => {
    if (!loadingRef) {
      fetchDocuments();
    }
  }, [selectedBatchId, selectedCourseId, moduleId, searchQuery, loadingRef, fetchDocuments]);

  function handleDownload(d: BackendDocumentItem) {
    if (d.fileUrl) {
      triggerDownload(d.fileUrl, d.title);
    }
  }

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
      const targetCourseId = found?.courseId || found?.course?.id;
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
    setSearchQuery("");
    setSearchParams({});
  };

  const clearScope = () => {
    handleClearFilters();
  };

  // Context labels
  const contextCourseName = batchResolvedCourseName || cleanDisplayString(selectedCourse?.courseName || documents[0]?.courseName);
  const contextModuleName = cleanDisplayString(documents[0]?.moduleName);
  const contextBatchName = cleanDisplayString(selectedBatch?.batchName || documents[0]?.batchName);

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      {/* ─────────────────────────────────────────────────────────────────────────
          HEADER & FILTER TOOLBAR (IN ONE LINE)
          ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Header Title Row */}
        <div>
          <div className="flex items-center gap-2">
            {moduleId && (
              <Link
                to={`/content/modules${
                  selectedCourseId && selectedCourseId !== "all" && selectedCourseId !== "none"
                    ? `?courseId=${selectedCourseId}`
                    : ""
                }${selectedBatchId && selectedBatchId !== "all" ? `&batchId=${selectedBatchId}` : ""}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#DE896A] hover:underline mr-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Modules
              </Link>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-[#3A2A22]">Materials</h1>
          </div>
          <p className="mt-1 text-sm text-[#8C7A70]">
            Reference material, presentations, and study guides attached to your curriculum.
          </p>
        </div>

        {/* Single-Line Action Toolbar: Search + Batches + Courses + Clear + Upload */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full">
          {/* Search Materials Input */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search materials..."
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

          {/* Batch Selector Dropdown */}
          <div className="w-44 sm:w-48 shrink-0">
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
                    {cleanDisplayString(b.batchName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Course Selector Dropdown */}
          <div className="w-48 sm:w-56 shrink-0">
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
                        {cleanDisplayString(c.name || c.courseName)}
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
          {(selectedBatchId !== "all" || selectedCourseId !== "all" || searchQuery.trim() || moduleId) && (
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

          {/* Upload Material Button */}
          <Button onClick={() => setModalOpen(true)} className="h-10 rounded-xl shadow-xs shrink-0 sm:ml-auto">
            <Upload className="mr-1.5 h-4 w-4" /> Upload Material
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          SCOPED CONTEXT HERO BANNER
          ───────────────────────────────────────────────────────────────────────── */}
      {(moduleId || selectedCourseId !== "all" || selectedBatchId !== "all") && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F5E2DA] bg-gradient-to-r from-[#FFFBF9] via-[#FFF6F2] to-[#FAF3EF] p-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-bold text-[#DE896A] uppercase tracking-wider text-[10px]">
              <Sparkles className="h-3 w-3" /> Scoped Context:
            </span>
            {selectedBatch && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-[#F5E2DA] px-2.5 py-1 font-semibold text-[#233047]">
                <Users className="h-3 w-3 text-[#DE896A]" /> Batch: {cleanDisplayString(selectedBatch.batchName)}
              </span>
            )}
            {contextCourseName && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-[#F5E2DA] px-2.5 py-1 font-semibold text-[#233047]">
                <Layers className="h-3 w-3 text-[#DE896A]" /> Course: {contextCourseName}
              </span>
            )}
            {moduleId && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-[#F5E2DA] px-2.5 py-1 font-semibold text-[#233047]">
                <Boxes className="h-3 w-3 text-[#DE896A]" /> Module: {contextModuleName || "Active Module"}
              </span>
            )}
          </div>

          <button
            onClick={clearScope}
            className="text-xs font-semibold text-[#DE896A] hover:underline inline-flex items-center gap-1"
          >
            Show All Materials <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Search Filter Banner */}
      {searchQuery.trim() && (
        <div className="flex items-center justify-between rounded-xl border border-[#F0DED4] bg-[#FFFBF9] px-4 py-2.5 text-xs text-[#8C7A70]">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-[#DE896A]" />
            <span>
              Showing <strong className="text-[#3A2A22]">{documents.length}</strong> material
              {documents.length === 1 ? "" : "s"} matching "
              <strong className="text-[#DE896A]">{searchQuery}</strong>"
            </span>
          </div>
          <button
            onClick={() => handleSearchChange("")}
            className="flex items-center gap-1 font-semibold text-[#DE896A] hover:underline"
          >
            <span>Clear filter</span>
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MATERIALS TABLE CARD
          ───────────────────────────────────────────────────────────────────────── */}
      <Card className="rounded-2xl border-[#F5E2DA] shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#F5E2DA] bg-[#FFFBF9] text-[10px] font-bold uppercase tracking-wider text-[#B7A79D]">
                <th className="px-5 py-3">Document Title</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Batch</th>
                <th className="px-5 py-3">Module</th>
                <th className="px-5 py-3">Format</th>
                <th className="px-5 py-3">Size</th>
                <th className="px-5 py-3">Uploaded</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5E2DA]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-[#B7A79D]">
                    Loading materials...
                  </td>
                </tr>
              ) : selectedCourseId === "none" ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-[#B7A79D]">
                    No course assigned to this batch, so no materials are available.
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-[#B7A79D]">
                    {searchQuery.trim()
                      ? `No materials found matching "${searchQuery}".`
                      : "No materials uploaded for this selection yet."}
                  </td>
                </tr>
              ) : (
                documents.map((d) => {
                  const extension = (d.fileUrl || "").split(".").pop()?.toUpperCase() || "DOC";
                  const tone = fileToneMap[extension] || "neutral";
                  const cleanDocTitle = cleanDisplayString(d.title);
                  const cleanCourse = cleanDisplayString(d.courseName);
                  const cleanBatch = cleanDisplayString(d.batchName);
                  const cleanModule = cleanDisplayString(d.moduleName);

                  return (
                    <tr key={d.id} className="transition-colors hover:bg-[#FFFBF9]/80">
                      {/* TITLE */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A]">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#233047]">{cleanDocTitle}</p>
                            {d.lessonTitle && (
                              <p className="text-xs text-[#8C7A70]">
                                Lesson: {cleanDisplayString(d.lessonTitle)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* COURSE */}
                      <td className="px-5 py-4 text-xs font-medium text-[#233047]">
                        {cleanCourse || "—"}
                      </td>

                      {/* BATCH */}
                      <td className="px-5 py-4 text-xs text-[#8C7A70]">
                        {cleanBatch || "—"}
                      </td>

                      {/* MODULE */}
                      <td className="px-5 py-4 text-xs text-[#8C7A70]">
                        {cleanModule || "—"}
                      </td>

                      {/* FORMAT */}
                      <td className="px-5 py-4">
                        <Badge tone={tone} className="text-[10px] font-bold">
                          {extension}
                        </Badge>
                      </td>

                      {/* SIZE */}
                      <td className="px-5 py-4 text-xs text-[#8C7A70]">
                        {d.fileSize ? formatFileSize(d.fileSize) : d.size || "—"}
                      </td>

                      {/* UPLOADED DATE */}
                      <td className="px-5 py-4 text-xs text-[#8C7A70]">
                        {formatDate(d.uploadedAt || d.createdAt)}
                      </td>

                      {/* ACTION: DOWNLOAD */}
                      <td className="px-5 py-4 text-right">
                        {d.fileUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(d)}
                            className="h-8 rounded-lg border-[#F0DED4] bg-white px-2.5 text-xs text-[#DE896A] hover:bg-[#FBECE7] hover:text-[#C26D4D]"
                          >
                            <Download className="mr-1 h-3.5 w-3.5" />
                            Download
                          </Button>
                        ) : (
                          <span className="text-xs text-[#C7B6AC]">No File</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <UploadDocumentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultBatchId={selectedBatchId !== "all" ? selectedBatchId : undefined}
        defaultCourseId={
          selectedCourseId !== "all" && selectedCourseId !== "none"
            ? selectedCourseId
            : undefined
        }
        defaultModuleId={moduleId || undefined}
        onSuccess={fetchDocuments}
      />
    </div>
  );
}
