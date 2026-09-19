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
  getTrainerBatchesApi,
  getTrainerCoursesApi,
  getTraineesApi,
  bulkSaveAttendanceApi,
  markAttendanceApi,
  getAttendanceByBatchApi,
  type BackendBatchItem,
  type TrainerCourseItem,
  type TraineeListItem,
} from "@/services/api";
import { fetchBatchClassScheduleByBatchIdApi } from "@/helpers/api/batchClassScheduleApi";
import { fetchBatchEventsForTraineeApi, type BatchEvent } from "@/services/batchEventApi";
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
 * Local calendar date as YYYY-MM-DD. `.toISOString()` converts to UTC first, which
 * rolls the date back a day for anyone east of UTC during their early-morning hours
 * (e.g. IST 12:00am-5:30am) — attendance saved "for today" would then be stored
 * under yesterday's UTC date, making it look like it never saved once the local
 * clock (and this function, computed fresh) crossed into the next UTC day.
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
  const [batches, setBatches] = useState<BackendBatchItem[]>([]);
  const [courses, setCourses] = useState<TrainerCourseItem[]>([]);
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

  // Selected register date — defaults to today; picking an earlier date shows
  // that day's attendance (read-only) across the selected batch(es).
  const todayStr = localDateStr();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const isToday = selectedDate === todayStr;
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Track whether the selected batch (or any authorized batch) has an actual session on selectedDate
  const [hasSessionForSelectedDate, setHasSessionForSelectedDate] = useState<boolean>(true);

  // In-memory cache for batch class schedules and batch events to avoid repeated API requests
  const scheduleCacheRef = useRef<Map<string, any[]>>(new Map());
  const eventsCacheRef = useRef<Map<string, BatchEvent[]>>(new Map());

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Parallel Initial Load: Batches & Courses
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      try {
        setLoadingInitial(true);
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

        // Resolve initial selection from requestedBatchId or default to "all"
        if (requestedBatchId && batchesRes.some((b) => b.id === requestedBatchId)) {
          setSelectedBatchId(requestedBatchId);
          const foundBatch = batchesRes.find((b) => b.id === requestedBatchId);
          const targetCourseId = foundBatch?.courseId || foundBatch?.course?.id;
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
    return (
      courses.find((c) => (c.id || (c as any).courseId) === selectedCourseId) ||
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
    const directCourseName = selectedBatch.course?.courseName;
    if (directCourseName) return cleanDisplayString(directCourseName);
    const targetCourseId = selectedBatch.courseId || selectedBatch.course?.id;
    if (targetCourseId) {
      const match = courses.find((c) => (c.id || (c as any).courseId) === targetCourseId);
      if (match?.courseName) return cleanDisplayString(match.courseName);
    }
    return null;
  }, [selectedBatch, courses]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Fetch Roster & Existing Attendance for Current Filter
  // ─────────────────────────────────────────────────────────────────────────────
  const getBatchSchedulesAndEvents = useCallback(async (bId: string) => {
    let schedules = scheduleCacheRef.current.get(bId);
    if (!schedules) {
      try {
        schedules = await fetchBatchClassScheduleByBatchIdApi(bId);
        scheduleCacheRef.current.set(bId, Array.isArray(schedules) ? schedules : []);
      } catch {
        schedules = [];
        scheduleCacheRef.current.set(bId, []);
      }
    }

    let events = eventsCacheRef.current.get(bId);
    if (!events) {
      try {
        events = await fetchBatchEventsForTraineeApi(bId);
        eventsCacheRef.current.set(bId, Array.isArray(events) ? events : []);
      } catch {
        events = [];
        eventsCacheRef.current.set(bId, []);
      }
    }

    return {
      schedules: schedules || [],
      events: events || [],
    };
  }, []);

  const checkBatchSessionForDate = useCallback(
    (
      bId: string,
      targetDate: string,
      schedules: any[],
      events: BatchEvent[],
      attList: any[]
    ) => {
      // 1. Real historical attendance records for this batch on targetDate
      const hasRecordedAttendance = attList.some((rec) => {
        const recBatchId = rec.batchId || "";
        const recDate = rec.sessionDate || (rec.createdAt ? String(rec.createdAt).split("T")[0] : "");
        return recBatchId === bId && recDate === targetDate;
      });

      // 2. Class schedule in batchClassSchedules
      const hasClassSchedule = schedules.some((sch) => {
        if (!sch) return false;
        const start = sch.startDate ? String(sch.startDate).split("T")[0] : "";
        const end = sch.endDate ? String(sch.endDate).split("T")[0] : start;
        if (!start) return false;
        return targetDate >= start && targetDate <= end;
      });

      // 3. Batch event for this batch on targetDate (excluding holidays)
      const hasBatchEvent = events.some((evt) => {
        if (!evt || !evt.eventDate) return false;
        const evtDate = String(evt.eventDate).split("T")[0];
        if (evtDate !== targetDate) return false;
        const type = String(evt.type || "").toLowerCase();
        if (type === "holiday") return false;
        return true;
      });

      return hasRecordedAttendance || hasClassSchedule || hasBatchEvent;
    },
    []
  );

  const fetchRosterData = useCallback(
    async (batchId: string, courseId: string, currentBatches: BackendBatchItem[], dateStr: string) => {
      try {
        setLoadingRoster(true);

        const params: { batchId?: string; courseId?: string; limit?: number } = { limit: 1000 };
        if (batchId !== "all") {
          params.batchId = batchId;
        } else if (courseId !== "all" && courseId !== "none") {
          params.courseId = courseId;
        }

        const [traineesRes, attRes] = await Promise.all([
          getTraineesApi(params),
          getAttendanceByBatchApi(
            batchId !== "all" ? batchId : undefined,
            courseId !== "all" && courseId !== "none" ? courseId : undefined,
            dateStr
          ).catch(() => null),
        ]);

        const list: TraineeListItem[] = traineesRes.data?.trainees || [];
        const attList: any[] = attRes?.attendance?.data || attRes?.attendance || [];

        // Determine which authorized batches had an actual session/class on dateStr
        const targetBatches = batchId !== "all"
          ? currentBatches.filter((b) => b.id === batchId)
          : currentBatches;

        const batchSessionResults = await Promise.all(
          targetBatches.map(async (b) => {
            const { schedules, events } = await getBatchSchedulesAndEvents(b.id);
            const hasSession = checkBatchSessionForDate(b.id, dateStr, schedules, events, attList);
            return { batchId: b.id, hasSession };
          })
        );

        const batchesWithSession = new Set(
          batchSessionResults.filter((r) => r.hasSession).map((r) => r.batchId)
        );

        const currentScopeHasSession = batchId !== "all"
          ? batchesWithSession.has(batchId)
          : batchesWithSession.size > 0;

        setHasSessionForSelectedDate(currentScopeHasSession);

        // Build the selected date's existing attendance map strictly for batches with active sessions
        const attMap = new Map<string, { status: AttendanceStatus; remark: string }>();
        let hasRecordForDate = false;

        // Status priority for multi-batch resolution: P > L > A
        const statusPriority: Record<AttendanceStatus, number> = { P: 3, L: 2, A: 1 };

        if (currentScopeHasSession) {
          for (const rec of attList) {
            const recDate = rec.sessionDate || (rec.createdAt ? String(rec.createdAt).split("T")[0] : "");
            if (recDate === dateStr) {
              const recBatchId = rec.batchId || "";
              // Only batches that actually had a session on dateStr contribute attendance
              if (recBatchId && !batchesWithSession.has(recBatchId)) {
                continue;
              }

              hasRecordForDate = true;
              const s = String(rec.status || rec.attendance || "").toLowerCase();
              let st: AttendanceStatus = "P";
              if (s === "absent") st = "A";
              else if (s === "late") st = "L";

              // Always store the batch-specific key
              if (rec.userId && recBatchId) {
                attMap.set(`${rec.userId}_${recBatchId}`, { status: st, remark: rec.remark || "" });
              }

              // For the userId-only key, keep highest-priority status across active batches
              if (rec.userId) {
                const existingByUser = attMap.get(rec.userId);
                if (!existingByUser || statusPriority[st] > statusPriority[existingByUser.status]) {
                  attMap.set(rec.userId, { status: st, remark: rec.remark || "" });
                }
              }
            }
          }
        }

        const finalizedKey = batchId !== "all" ? `${batchId}_${dateStr}` : null;
        if (finalizedKey) {
          setFinalized((prev) => ({ ...prev, [finalizedKey]: hasRecordForDate }));
        }

        // Deduplicate trainees by unique trainee user ID:
        // A trainee enrolled in multiple batches must count as ONE unique trainee user.
        const uniqueTraineeMap = new Map<string, TraineeListItem>();
        for (const t of list) {
          const tId = t.id || (t as any).traineeId;
          if (!tId) continue;
          if (!uniqueTraineeMap.has(tId)) {
            uniqueTraineeMap.set(tId, { ...t, id: tId });
          } else {
            // Aggregate batch names for display in multi-batch scenarios
            const existing = uniqueTraineeMap.get(tId)!;
            const currentBName = t.batchName || currentBatches.find((b) => b.id === t.batchId)?.batchName;
            if (currentBName && existing.batchName && !existing.batchName.includes(currentBName)) {
              existing.batchName = `${existing.batchName}, ${currentBName}`;
            }
          }
        }
        const uniqueList = Array.from(uniqueTraineeMap.values());

        const newRoster: RosterEntry[] = uniqueList.map((t) => {
          const displayName = t.name || (t as any).fullName || "Trainee";
          const initials = getInitials(displayName);
          const bId = t.batchId || (batchId !== "all" ? batchId : "");
          const parentBatch = currentBatches.find((b) => b.id === bId);
          const bName = cleanDisplayString(t.batchName || parentBatch?.batchName || "Batch");
          const cName = cleanDisplayString(
            t.courseName || (t as any).course?.courseName || parentBatch?.course?.courseName || "General Course"
          );

          // Check if this trainee's batch had a session on the selected date
          const traineeBatchHasSession = bId ? batchesWithSession.has(bId) : currentScopeHasSession;

          // If no session existed for this batch on dateStr, trainee has NO record and NO status
          if (!traineeBatchHasSession) {
            return {
              traineeId: t.id,
              batchId: bId,
              batchName: bName,
              courseName: cName,
              name: cleanDisplayString(displayName),
              email: t.email || "",
              initials,
              status: undefined,
              remark: "",
              hasRecord: false,
            };
          }

          const existing = attMap.get(`${t.id}_${bId}`) || attMap.get(t.id);
          return {
            traineeId: t.id,
            batchId: bId,
            batchName: bName,
            courseName: cName,
            name: cleanDisplayString(displayName),
            email: t.email || "",
            initials,
            status: existing ? existing.status : undefined,
            remark: existing?.remark || "",
            hasRecord: Boolean(existing),
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
    [getBatchSchedulesAndEvents, checkBatchSessionForDate]
  );

  useEffect(() => {
    if (!loadingInitial) {
      fetchRosterData(selectedBatchId, selectedCourseId, batches, selectedDate);
      setPage(0);
    }
  }, [selectedBatchId, selectedCourseId, selectedDate, loadingInitial, batches, fetchRosterData]);

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
      const targetCourseId = foundBatch?.courseId || foundBatch?.course?.id;
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
    const courseId = targetBatch?.course?.id || targetBatch?.courseId || undefined;

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
      const courseId = selectedBatch.course?.id || selectedBatch.courseId || "";
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
      toast.success(`Register saved for ${cleanDisplayString(selectedBatch.batchName)}`);
      // Refresh saved attendance
      fetchRosterData(selectedBatch.id, selectedCourseId, batches, selectedDate);
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
    return <PageLoader text="Loading..." />;
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
                    {cleanDisplayString(b.batchName)}
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
                        {cleanDisplayString(c.courseName)}
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
                <Badge tone="neutral">BATCH: {cleanDisplayString(selectedBatch.batchName)}</Badge>
                {batchResolvedCourseName ? (
                  <Badge tone="neutral">COURSE: {cleanDisplayString(batchResolvedCourseName)}</Badge>
                ) : (
                  <Badge tone="red">NO COURSE ASSIGNED</Badge>
                )}
              </>
            ) : selectedCourse ? (
              <Badge tone="neutral">COURSE: {cleanDisplayString(selectedCourse.courseName)}</Badge>
            ) : (
              <Badge tone="neutral">ALL AUTHORIZED BATCHES</Badge>
            )}
          </div>

          <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#3A2A22]">
                {selectedBatch
                  ? cleanDisplayString(selectedBatch.batchName)
                  : selectedCourse
                  ? cleanDisplayString(selectedCourse.courseName)
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
                    ? `Batch: ${cleanDisplayString(selectedBatch.batchName)}`
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
                    : `No class scheduled for this date for ${cleanDisplayString(selectedBatch?.batchName)}.`}
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
                      <td colSpan={6} className="px-5 py-12 text-center text-sm text-[#B7A79D]">
                        Loading attendance register...
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
                  : `Attendance Rate — ${cleanDisplayString(selectedBatch?.batchName)}`}
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
                  : `Batch Details — ${cleanDisplayString(selectedBatch?.batchName)}`}
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
                  {selectedBatch?.startDate && (
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[#8C7A70]">Batch Start Date</span>
                      <span className="font-bold text-[#3A2A22]">
                        {bqStr(selectedBatch.startDate)}
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
