import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  RotateCcw,
  Check,
  AlertCircle,
  BookOpen,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { RadialProgress, ProgressBar } from "@/components/ui/ProgressBar";
import {
  getTrainerBatchFiltersApi,
  getTrainerCourseFiltersApi,
  getTrainerAttendanceApi,
  bulkSaveAttendanceApi,
  markAttendanceApi,
  type BatchFilterItem,
  type CourseFilterItem,
  type TrainerAttendanceItem,
} from "@/services/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Calendar } from "@/components/ui/Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import type { AttendanceStatus } from "@/types";
import { cn } from "@/lib/utils";
import PageLoader from "@/components/ui/PageLoader";

function cleanDisplayString(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/\s*-\s*cid-[a-zA-Z0-9_-]+/gi, "")
    .replace(/\s*-\s*[0-9a-fA-F-]{36}/gi, "")
    .replace(/^cid-[a-zA-Z0-9_-]+\s*/gi, "")
    .replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/gi, "")
    .trim();
}

function getInitials(name?: string): string {
  if (!name || !name.trim()) return "TR";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

/** BigQuery DATE/TIMESTAMP columns can come back as {value: '2026-09-08'} objects. */
function bqStr(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && "value" in (val as object))
    return String((val as { value: unknown }).value);
  return String(val);
}

/**
 * Local calendar date as YYYY-MM-DD.
 */
function localDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const PAGE_SIZE = 8;

interface RosterEntry {
  traineeId: string;
  batchId?: string;
  batchName?: string;
  courseName?: string;
  name: string;
  email: string;
  initials: string;
  status?: AttendanceStatus;
  remark: string;
  hasRecord: boolean;
}

export default function Attendance() {
  const location = useLocation();
  const requestedBatchId = (location.state as { batchId?: string } | null)?.batchId;

  // Reference data from BigQuery / APIs
  const [batches, setBatches] = useState<BatchFilterItem[]>([]);
  const [courses, setCourses] = useState<CourseFilterItem[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Filter state
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Roster & Attendance state
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [finalized, setFinalized] = useState<Record<string, boolean>>({});
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);

  // Selected register date
  const todayStr = localDateStr();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const isToday = selectedDate === todayStr;
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Track whether the selected batch (or any authorized batch) has an actual session on selectedDate
  const [hasSessionForSelectedDate, setHasSessionForSelectedDate] = useState<boolean>(true);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Parallel Initial Load: Lightweight Batches & Courses Filters
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      try {
        setLoadingInitial(true);
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

        // Resolve initial selection from requestedBatchId or default to "all"
        if (requestedBatchId && batchesRes.some((b) => b.id === requestedBatchId)) {
          setSelectedBatchId(requestedBatchId);
          const foundBatch = batchesRes.find((b) => b.id === requestedBatchId);
          const targetCourseId = foundBatch?.courseId;
          if (targetCourseId) {
            setSelectedCourseId(targetCourseId);
          } else {
            setSelectedCourseId("none");
          }
        } else {
          setSelectedBatchId("all");
          setSelectedCourseId("all");
        }
      } catch (err) {
        console.error("Failed to load attendance initial data:", err);
        toast.error("Failed to load batches and courses.");
      } finally {
        if (mounted) setLoadingInitial(false);
      }
    }

    loadInitialData();
    return () => {
      mounted = false;
    };
  }, [requestedBatchId]);

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
  // 3. Fetch Roster & Existing Attendance via Canonical API
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchRosterData = useCallback(
    async (batchId: string, courseId: string, dateStr: string) => {
      try {
        setLoadingRoster(true);

        const attItems: TrainerAttendanceItem[] = await getTrainerAttendanceApi({
          batchId: batchId !== "all" ? batchId : undefined,
          courseId: courseId !== "all" && courseId !== "none" ? courseId : undefined,
          date: dateStr,
        });

        // If today, or if records exist, or trainees found, allow taking/viewing attendance
        const hasAnyRecords = attItems.some((r) => Boolean(r.status));
        setHasSessionForSelectedDate(isToday || hasAnyRecords || attItems.length > 0);

        const finalizedKey = batchId !== "all" ? `${batchId}_${dateStr}` : null;
        if (finalizedKey) {
          setFinalized((prev) => ({ ...prev, [finalizedKey]: hasAnyRecords }));
        }

        const newRoster: RosterEntry[] = attItems.map((item) => {
          const displayName = item.traineeName || "Trainee";
          const initials = getInitials(displayName);
          const bName = cleanDisplayString(item.batchName || "Batch");
          const cName = cleanDisplayString(item.courseName || "General Course");

          let status: AttendanceStatus | undefined = undefined;
          if (item.status === "present") status = "P";
          else if (item.status === "absent") status = "A";
          else if (item.status === "late") status = "L";

          return {
            traineeId: item.traineeId,
            batchId: item.batchId,
            batchName: bName,
            courseName: cName,
            name: cleanDisplayString(displayName),
            email: item.email || "",
            initials,
            status,
            remark: "",
            hasRecord: Boolean(item.status),
          };
        });

        setRoster(newRoster);
      } catch (err) {
        console.error("Failed to load attendance roster:", err);
        toast.error("Failed to load trainees for attendance.");
        setRoster([]);
      } finally {
        setLoadingRoster(false);
      }
    },
    [isToday]
  );

  useEffect(() => {
    if (!loadingInitial) {
      fetchRosterData(selectedBatchId, selectedCourseId, selectedDate);
      setPage(0);
    }
  }, [selectedBatchId, selectedCourseId, selectedDate, loadingInitial, fetchRosterData]);

  const handleDateChange = (newDate: string) => {
    if (!newDate) return;
    setSelectedDate(newDate);
    setPage(0);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Filter Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleBatchChange = (newBatchId: string) => {
    setSelectedBatchId(newBatchId);
    setPage(0);

    if (newBatchId === "all") {
      setSelectedCourseId("all");
    } else {
      const foundBatch = batches.find((b) => b.id === newBatchId);
      const targetCourseId = foundBatch?.courseId;
      if (targetCourseId) {
        setSelectedCourseId(targetCourseId);
      } else {
        setSelectedCourseId("none");
      }
    }
  };

  const handleCourseChange = (newCourseId: string) => {
    // Only changeable when selectedBatchId is "all"
    if (selectedBatchId === "all") {
      setSelectedCourseId(newCourseId);
      setPage(0);
    }
  };

  const handleClearFilters = () => {
    setSelectedBatchId("all");
    setSelectedCourseId("all");
    setSearchQuery("");
    setPage(0);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. In-Row Status & Remark Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const statusApiMap: Record<AttendanceStatus, "present" | "absent" | "late"> = {
    P: "present",
    A: "absent",
    L: "late",
  };

  // Fires an immediate per-trainee save (POST /attendance/manual) the moment a
  // status is picked, instead of only persisting on the separate "Finalize" bulk
  // save. Upserts today's attendance row for that specific trainee id.
  const setStatus = (traineeId: string, status: AttendanceStatus, batchId?: string) => {
    if (!hasSessionForSelectedDate) {
      toast.error("No class/session is scheduled for this date.");
      return;
    }

    const rowKey = `${traineeId}_${batchId || selectedBatchId}`;

    setRoster((prev) =>
      prev.map((r) => {
        if (r.traineeId === traineeId && (!batchId || r.batchId === batchId)) {
          return { ...r, status, hasRecord: true };
        }
        return r;
      })
    );

    if (!isToday) return;

    const targetBatchId = batchId || (selectedBatchId !== "all" ? selectedBatchId : undefined);
    if (!targetBatchId) {
      toast.error("Select a specific batch before marking attendance.");
      return;
    }
    const targetBatch = batches.find((b) => b.id === targetBatchId);
    const courseId = targetBatch?.courseId || undefined;

    setSavingRowKey(rowKey);
    markAttendanceApi({
      userId: traineeId,
      batchId: targetBatchId,
      courseId,
      attendanceStatus: statusApiMap[status],
      sessionDate: selectedDate,
    })
      .then(() => {
        setFinalized((prev) => ({ ...prev, [`${targetBatchId}_${selectedDate}`]: true }));
        setRoster((prev) =>
          prev.map((r) =>
            r.traineeId === traineeId && (!batchId || r.batchId === batchId)
              ? { ...r, hasRecord: true }
              : r
          )
        );
      })
      .catch((err) => {
        console.error("Failed to save attendance for trainee:", traineeId, err);
        toast.error(err?.response?.data?.message || "Failed to save attendance for this trainee.");
      })
      .finally(() => {
        setSavingRowKey((prev) => (prev === rowKey ? null : prev));
      });
  };

  const setRemark = (traineeId: string, remark: string, batchId?: string) => {
    setRoster((prev) =>
      prev.map((r) => {
        if (r.traineeId === traineeId && (!batchId || r.batchId === batchId)) {
          return { ...r, remark };
        }
        return r;
      })
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Save / Finalize Register to BigQuery
  // ─────────────────────────────────────────────────────────────────────────────
  const handleFinalize = async () => {
    if (!selectedBatch || selectedBatchId === "all") {
      toast.error("Please select a specific batch to record attendance.");
      return;
    }
    if (!hasSessionForSelectedDate) {
      toast.error("No class/session is scheduled for this date.");
      return;
    }
    if (roster.length === 0) {
      toast.error("No trainees enrolled in this batch to mark attendance for.");
      return;
    }

    try {
      setSaving(true);
      const courseId = selectedBatch.courseId || "";
      const statusMap: Record<AttendanceStatus, "present" | "absent" | "late"> = {
        P: "present",
        A: "absent",
        L: "late",
      };

      const payload = {
        batchId: selectedBatch.id,
        courseId,
        sessionDate: selectedDate,
        records: roster
          .filter((r): r is RosterEntry & { status: AttendanceStatus } => Boolean(r.status))
          .map((r) => ({
            userId: r.traineeId,
            status: statusMap[r.status],
            remark: r.remark || undefined,
          })),
      };

      await bulkSaveAttendanceApi(payload);
      setFinalized((prev) => ({ ...prev, [`${selectedBatch.id}_${selectedDate}`]: true }));
      toast.success(`Register saved for ${cleanDisplayString(selectedBatch.name || (selectedBatch as any).batchName)}`);
      // Refresh saved attendance
      fetchRosterData(selectedBatch.id, selectedCourseId, selectedDate);
    } catch (err: any) {
      console.error("Failed to save attendance:", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to save attendance.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Computed Statistics & Client-Side Filtering
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredRoster = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.batchName && r.batchName.toLowerCase().includes(q)) ||
        (r.courseName && r.courseName.toLowerCase().includes(q))
    );
  }, [roster, searchQuery]);

  const counts = useMemo(() => {
    // If no class/session occurred on the selected date, all attendance counts are strictly 0
    if (!hasSessionForSelectedDate) {
      return { total: roster.length, present: 0, absent: 0, late: 0 };
    }
    // Count every trainee whose current status is Present, Absent, or Late strictly from real records
    const present = roster.filter((r) => r.hasRecord && r.status === "P").length;
    const absent = roster.filter((r) => r.hasRecord && r.status === "A").length;
    const late = roster.filter((r) => r.hasRecord && r.status === "L").length;
    return { total: roster.length, present, absent, late };
  }, [roster, hasSessionForSelectedDate]);

  // Independent percentage calculations derived strictly from real attendance records
  const presentPercentage =
    counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0;
  const absentPercentage =
    counts.total > 0 ? Math.round((counts.absent / counts.total) * 100) : 0;
  const latePercentage =
    counts.total > 0 ? Math.round((counts.late / counts.total) * 100) : 0;

  // Overall Attendance Rate strictly: Present trainees / total authorized unique trainees
  const overallAttendanceRate = presentPercentage;
  const attendanceRate = overallAttendanceRate;

  const totalPages = Math.max(1, Math.ceil(filteredRoster.length / PAGE_SIZE));
  const pageStart = page * PAGE_SIZE;
  const pageRows = filteredRoster.slice(pageStart, pageStart + PAGE_SIZE);

  const selectedDateFormatted = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const displayDateText = useMemo(() => {
    const [year, month, day] = selectedDate.split("-");
    const formatted = `${day}-${month}-${year}`;
    return isToday ? `Today, ${formatted}` : formatted;
  }, [selectedDate, isToday]);

  const parsedSelectedDate = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDate]);

  const isAllSelected = selectedBatchId === "all";

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Skeleton Loading UI
  // ─────────────────────────────────────────────────────────────────────────────
  if (loadingInitial) {
    return <PageLoader />;
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      {/* ─────────────────────────────────────────────────────────────────────────
          HEADER & FILTER TOOLBAR
          ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#3A2A22]">Attendance</h1>
          <p className="mt-1 text-sm text-[#8C7A70]">
            Track and manage trainee attendance for each batch.
          </p>
        </div>

        {/* Responsive Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search trainees input */}
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search trainees..."
              className="h-10 pl-9 pr-3 rounded-xl border-[#F0DED4] bg-white text-xs text-[#3A2A22] placeholder:text-[#C7B6AC]"
            />
          </div>

          {/* Batch Filter Dropdown */}
          <div className="w-full sm:w-48">
            <Select
              value={selectedBatchId}
              onValueChange={handleBatchChange}
              disabled={batches.length === 0}
            >
              <SelectTrigger className="h-10 rounded-xl border-[#F0DED4] bg-white text-xs font-medium text-[#3A2A22]">
                <SelectValue placeholder="All Batches" />
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

          {/* Course Filter Dropdown */}
          <div className="w-full sm:w-52">
            <Select
              value={selectedCourseId}
              onValueChange={handleCourseChange}
              disabled={selectedBatchId !== "all"}
            >
              <SelectTrigger
                className={cn(
                  "h-10 rounded-xl border-[#F0DED4] bg-white text-xs font-medium text-[#3A2A22]",
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
                      <SelectItem key={c.id || (c as any).courseId} value={c.id || (c as any).courseId}>
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
          {(selectedBatchId !== "all" || selectedCourseId !== "all" || searchQuery.trim()) && (
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
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          CONTEXTUAL ATTENDANCE HEADER CARD
          ───────────────────────────────────────────────────────────────────────── */}
      <Card className="relative overflow-hidden border-[#F0DAC9] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FDF1EA] via-[#FBECE7] to-[#F5D1C4]" />
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#EEAF9C]/30 blur-2xl" />
        <div className="absolute -bottom-14 right-24 h-32 w-32 rounded-full bg-[#DE896A]/20 blur-2xl" />
        <CardContent className="relative p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="orange">ATTENDANCE</Badge>
            {selectedBatch ? (
              <>
                <Badge tone="neutral">BATCH: {cleanDisplayString(selectedBatch.name || (selectedBatch as any).batchName)}</Badge>
                {batchResolvedCourseName ? (
                  <Badge tone="neutral">COURSE: {cleanDisplayString(batchResolvedCourseName)}</Badge>
                ) : (
                  <Badge tone="red">NO COURSE ASSIGNED</Badge>
                )}
              </>
            ) : selectedCourse ? (
              <Badge tone="neutral">COURSE: {cleanDisplayString(selectedCourse.name || (selectedCourse as any).courseName)}</Badge>
            ) : (
              <Badge tone="neutral">ALL AUTHORIZED BATCHES</Badge>
            )}
          </div>

          <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#3A2A22]">
                {selectedBatch
                  ? cleanDisplayString(selectedBatch.name || (selectedBatch as any).batchName)
                  : selectedCourse
                  ? cleanDisplayString(selectedCourse.name || (selectedCourse as any).courseName)
                  : "Attendance Overview"}
              </h2>
              <p className="mt-1 text-sm font-medium text-[#DE896A]">
                {selectedBatch
                  ? batchResolvedCourseName || "No course assigned to this batch"
                  : selectedCourse
                  ? "All batches enrolled in this course"
                  : "All authorized batches & enrolled trainees"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-[#6B5A52]">
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-xl bg-white/70 px-3.5 py-1.5 backdrop-blur-sm border border-[#F0DED4]/60 font-medium text-sm text-[#3A2A22] hover:bg-white hover:border-[#DE896A]/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#DE896A]/30 cursor-pointer"
                    aria-label="Select attendance date"
                  >
                    <CalendarIcon className="h-4 w-4 text-[#DE896A] shrink-0" />
                    <span className="font-semibold text-[#DE896A]">Calendar</span>
                    <span className="text-sm font-medium text-[#3A2A22]">{displayDateText}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border border-[#F0DED4] bg-white shadow-xl shadow-black/5" align="end">
                  <Calendar
                    mode="single"
                    selected={parsedSelectedDate}
                    onSelect={(d) => {
                      if (d) {
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, "0");
                        const day = String(d.getDate()).padStart(2, "0");
                        handleDateChange(`${y}-${m}-${day}`);
                        setDatePickerOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="flex items-center gap-1.5 rounded-xl bg-white/70 px-3.5 py-2 backdrop-blur-sm border border-[#F0DED4]/60 font-medium">
                <Users className="h-4 w-4 text-[#DE896A]" />
                {counts.total} enrolled trainee{counts.total === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="mt-4 max-w-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-[#8C7A70]">
              <span>Overall Attendance Today</span>
              <span className="text-sm font-bold text-[#3A2A22]">{attendanceRate}%</span>
            </div>
            <ProgressBar value={attendanceRate} className="mt-1.5 h-2" />
          </div>
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────────────────
          4 SUMMARY STAT CARDS
          ───────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-[#F5E2DA] bg-white p-5 shadow-sm transition-all hover:border-[#DE896A]/40">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#B7A79D]">
            TOTAL TRAINEES
          </p>
          <p className="mt-2 text-3xl font-bold text-[#3A2A22]">{counts.total}</p>
          <p className="mt-1 text-xs font-semibold text-transparent select-none" aria-hidden="true">&nbsp;</p>
        </Card>

        <Card className="border-[#F5E2DA] bg-[#DE896A] p-5 text-white shadow-sm shadow-[#DE896A]/20">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">
            PRESENT
          </p>
          <p className="mt-2 text-3xl font-bold">{counts.present}</p>
          <p className="mt-1 text-xs font-semibold text-white/90">{presentPercentage}%</p>
        </Card>

        <Card className="border-[#F5E2DA] bg-white p-5 shadow-sm transition-all hover:border-[#DE896A]/40">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#B7A79D]">
            ABSENT
          </p>
          <p className="mt-2 text-3xl font-bold text-[#3A2A22]">{counts.absent}</p>
          <p className="mt-1 text-xs font-semibold text-[#8C7A70]">{absentPercentage}%</p>
        </Card>

        <Card className="border-[#F5E2DA] bg-white p-5 shadow-sm transition-all hover:border-[#DE896A]/40">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#B7A79D]">
            LATE
          </p>
          <p className="mt-2 text-3xl font-bold text-[#3A2A22]">{counts.late}</p>
          <p className="mt-1 text-xs font-semibold text-[#8C7A70]">{latePercentage}%</p>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          ATTENDANCE REGISTER & OVERVIEW
          ───────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left Column: Attendance Register (Table) */}
        <div className="min-w-0 w-full max-w-full xl:col-span-2">
          <Card className="border-[#F5E2DA] shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#F5E2DA] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#3A2A22]">Attendance Register</h2>
                <p className="text-xs text-[#8C7A70]">
                  {selectedBatch
                    ? `Batch: ${cleanDisplayString(selectedBatch.name || (selectedBatch as any).batchName)}`
                    : "All authorized trainees"}
                </p>
              </div>

              {/* Local Filter */}
              <div className="relative w-full sm:w-60">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Filter trainees..."
                  className="h-9 pl-9 pr-3 rounded-xl border-[#F0DED4] bg-[#FFFBF9] text-xs text-[#3A2A22] placeholder:text-[#C7B6AC]"
                />
              </div>
            </div>

            {/* Subtle banner when no class is scheduled on selected date */}
            {!hasSessionForSelectedDate && (
              <div className="flex items-center gap-2.5 border-b border-[#F5E2DA] bg-[#FFFBF9] px-5 py-3 text-xs text-[#8C7A70]">
                <AlertCircle className="h-4 w-4 text-[#DE896A] shrink-0" />
                <span className="font-medium">
                  {isAllSelected
                    ? "No class scheduled for this date across authorized batches."
                    : `No class scheduled for this date for ${cleanDisplayString(selectedBatch?.name || (selectedBatch as any)?.batchName)}.`}
                </span>
              </div>
            )}

            {/* Table Container without rigid fixed width */}
            <div className="w-full overflow-x-auto shadcn-scrollbar pb-1">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#F5E2DA] bg-[#FFFBF9] text-[10px] font-bold uppercase tracking-wider text-[#B7A79D]">
                    <th className="px-5 py-3">Trainee</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Batch</th>
                    <th className="px-5 py-3">Course</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5E2DA]">
                  {loadingRoster ? (
                    <tr>
                      <td colSpan={6} className="py-12">
                        <PageLoader className="min-h-[180px] py-6" />
                      </td>
                    </tr>
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-sm text-[#B7A79D]">
                        {roster.length === 0
                          ? isAllSelected
                            ? "No trainees enrolled across your authorized batches."
                            : "No trainees enrolled in this batch yet."
                          : "No trainees match your search."}
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row, idx) => (
                      <tr
                        key={`${row.traineeId}_${row.batchId || selectedBatchId}_${idx}`}
                        className="transition-colors hover:bg-[#FFFBF9]/80"
                      >
                        {/* TRAINEE */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar initials={row.initials} />
                            <span className="font-semibold text-[#3A2A22]">{row.name}</span>
                          </div>
                        </td>

                        {/* EMAIL */}
                        <td className="px-5 py-3.5 text-xs text-[#8C7A70]">
                          {row.email || "—"}
                        </td>

                        {/* BATCH */}
                        <td className="px-5 py-3.5 text-xs font-medium text-[#3A2A22]">
                          {row.batchName || "—"}
                        </td>

                        {/* COURSE */}
                        <td className="px-5 py-3.5 text-xs text-[#8C7A70]">
                          {row.courseName || "—"}
                        </td>

                        {/* STATUS */}
                        <td className="px-5 py-3.5">
                          {!hasSessionForSelectedDate ? (
                            <Badge tone="neutral" className="text-xs bg-[#F5EBE6] text-[#8C7A70] border-[#E8DCD5]">
                              Not Recorded
                            </Badge>
                          ) : !isToday ? (
                            row.hasRecord && row.status ? (
                              <Badge
                                tone={row.status === "P" ? "green" : row.status === "A" ? "red" : "amber"}
                                className="text-xs"
                              >
                                {row.status === "P" ? "Present" : row.status === "A" ? "Absent" : "Late"}
                              </Badge>
                            ) : (
                              <Badge tone="neutral" className="text-xs bg-[#F5EBE6] text-[#8C7A70] border-[#E8DCD5]">
                                Not Recorded
                              </Badge>
                            )
                          ) : (
                            <div className="flex items-center gap-2">
                              <Select
                                value={row.status || ""}
                                disabled={!isToday || !hasSessionForSelectedDate}
                                onValueChange={(val: AttendanceStatus) =>
                                  setStatus(row.traineeId, val, row.batchId)
                                }
                              >
                                <SelectTrigger
                                  className={cn(
                                    "h-9 w-28 rounded-xl border text-xs font-semibold transition-all",
                                    row.status === "P" &&
                                      "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100/70",
                                    row.status === "A" &&
                                      "border-red-200 bg-red-50 text-red-800 hover:bg-red-100/70",
                                    row.status === "L" &&
                                      "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100/70",
                                    !row.status &&
                                      "border-[#F0DED4] bg-white text-[#8C7A70] hover:border-[#DE896A]/50",
                                    (!isToday || !hasSessionForSelectedDate) && "opacity-70 cursor-not-allowed"
                                  )}
                                >
                                  <SelectValue placeholder="Mark status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="P">
                                    <div className="flex items-center gap-2">
                                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                      <span>Present</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="A">
                                    <div className="flex items-center gap-2">
                                      <span className="h-2 w-2 rounded-full bg-red-500" />
                                      <span>Absent</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="L">
                                    <div className="flex items-center gap-2">
                                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                                      <span>Late</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              {savingRowKey === `${row.traineeId}_${row.batchId || selectedBatchId}` && (
                                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#DE896A]" />
                              )}
                            </div>
                          )}
                        </td>

                        {/* REMARKS */}
                        <td className="px-5 py-3.5">
                          <Input
                            value={row.remark}
                            disabled={!isToday || !hasSessionForSelectedDate}
                            onChange={(e) => setRemark(row.traineeId, e.target.value, row.batchId)}
                            placeholder={isToday && hasSessionForSelectedDate ? "Add note..." : "—"}
                            className="h-9 w-full min-w-[140px] max-w-[200px] rounded-xl border-[#F0DED4] bg-white px-2.5 text-xs text-[#3A2A22] placeholder:text-[#C7B6AC] disabled:opacity-70 disabled:cursor-not-allowed"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-[#F5E2DA] px-5 py-3 text-xs text-[#8C7A70]">
              <span>
                Showing {Math.min(pageRows.length, PAGE_SIZE)} of {filteredRoster.length} trainees
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#F0DED4] hover:bg-[#FBECE7] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 font-medium">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#F0DED4] hover:bg-[#FBECE7] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Session Overview & Finalize Action */}
        <div className="min-w-0 w-full space-y-5">
          {/* Radial Progress Status Card */}
          <Card className="overflow-hidden border-none bg-gradient-to-br from-[#E38F6C] to-[#C26D4D] text-white shadow-md">
            <CardContent className="p-6 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                Session Status
              </p>
              <p className="mt-1 text-sm font-medium text-white/90">
                {isAllSelected
                  ? "Overall Attendance Rate"
                  : `Attendance Rate — ${cleanDisplayString(selectedBatch?.name || (selectedBatch as any)?.batchName)}`}
              </p>

              <div className="my-5 flex justify-center">
                <RadialProgress
                  value={attendanceRate}
                  size={116}
                  strokeWidth={10}
                  label={`${attendanceRate}%`}
                />
              </div>

              {isAllSelected ? (
                <div className="rounded-xl bg-white/20 px-3.5 py-3 text-xs font-medium text-white/95">
                  Select a specific batch to record or finalize register.
                </div>
              ) : !hasSessionForSelectedDate ? (
                <div className="rounded-xl bg-white/20 px-3.5 py-3 text-xs font-medium text-white/95">
                  No class scheduled for this date.
                </div>
              ) : !isToday ? (
                <div className="rounded-xl bg-white/20 px-3.5 py-3 text-xs font-medium text-white/95">
                  Viewing attendance for {selectedDateFormatted}. Switch to today to edit.
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleFinalize}
                  disabled={saving || roster.length === 0}
                  className="w-full justify-center border-white/40 bg-white font-semibold text-[#8A442E] shadow-sm hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-80"
                >
                  <CheckSquare className="mr-1.5 h-4 w-4" />
                  {saving
                    ? "Saving..."
                    : selectedBatch && finalized[`${selectedBatch.id}_${selectedDate}`]
                    ? "Update Register"
                    : "Finalize Register"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Context Details Card */}
          <Card className="border-[#F5E2DA] shadow-sm">
            <div className="border-b border-[#F5E2DA] p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#3A2A22]">
                {isAllSelected
                  ? "All Authorized Batches"
                  : `Batch Details — ${cleanDisplayString(selectedBatch?.name || (selectedBatch as any)?.batchName)}`}
              </h3>
            </div>
            <CardContent className="space-y-4 p-5 text-xs">
              {isAllSelected ? (
                <>
                  <div className="flex items-center justify-between py-1 border-b border-[#F5E2DA]/60">
                    <span className="font-semibold text-[#8C7A70]">Active Batches</span>
                    <span className="font-bold text-[#3A2A22]">{batches.length}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#F5E2DA]/60">
                    <span className="font-semibold text-[#8C7A70]">Total Enrolled</span>
                    <span className="font-bold text-[#3A2A22]">{counts.total}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#F5E2DA]/60">
                    <span className="font-semibold text-[#8C7A70]">Present Today</span>
                    <span className="font-bold text-emerald-700">
                      {counts.present} <span className="text-[11px] font-normal text-emerald-600/80">({presentPercentage}%)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#F5E2DA]/60">
                    <span className="font-semibold text-[#8C7A70]">Absent Today</span>
                    <span className="font-bold text-red-700">
                      {counts.absent} <span className="text-[11px] font-normal text-red-600/80">({absentPercentage}%)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#F5E2DA]/60">
                    <span className="font-semibold text-[#8C7A70]">Late Today</span>
                    <span className="font-bold text-amber-700">
                      {counts.late} <span className="text-[11px] font-normal text-amber-600/80">({latePercentage}%)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="font-semibold text-[#8C7A70]">Attendance Rate</span>
                    <span className="font-bold text-[#DE896A]">{overallAttendanceRate}%</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="py-1 border-b border-[#F5E2DA]/60">
                    <span className="font-semibold text-[#8C7A70]">Course</span>
                    <p className="mt-0.5 font-bold text-[#3A2A22]">
                      {batchResolvedCourseName || "No course assigned to this batch"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#F5E2DA]/60">
                    <span className="font-semibold text-[#8C7A70]">Enrolled Trainees</span>
                    <span className="font-bold text-[#3A2A22]">{counts.total}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#F5E2DA]/60">
                    <span className="font-semibold text-[#8C7A70]">Present</span>
                    <span className="font-bold text-emerald-700">
                      {counts.present} <span className="text-[11px] font-normal text-emerald-600/80">({presentPercentage}%)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#F5E2DA]/60">
                    <span className="font-semibold text-[#8C7A70]">Absent</span>
                    <span className="font-bold text-red-700">
                      {counts.absent} <span className="text-[11px] font-normal text-red-600/80">({absentPercentage}%)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#F5E2DA]/60">
                    <span className="font-semibold text-[#8C7A70]">Late</span>
                    <span className="font-bold text-amber-700">
                      {counts.late} <span className="text-[11px] font-normal text-amber-600/80">({latePercentage}%)</span>
                    </span>
                  </div>
                  {(selectedBatch as any)?.startDate && (
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[#8C7A70]">Batch Start Date</span>
                      <span className="font-bold text-[#3A2A22]">
                        {bqStr((selectedBatch as any).startDate)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
