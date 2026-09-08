import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Calendar,
  Clock,
  CheckSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { RadialProgress, ProgressBar } from "@/components/ui/ProgressBar";
import {
  getTrainerBatchesApi,
  getTraineesApi,
  bulkSaveAttendanceApi,
  getAttendanceByBatchApi,
  type BackendBatchItem,
  type TraineeListItem
} from "@/services/api";
import type { AttendanceStatus } from "@/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 6;
const STATUS_OPTIONS: AttendanceStatus[] = ["P", "A", "L"];

/** BigQuery DATE/TIMESTAMP columns can come back as {value: '2026-09-08'} objects.
 *  This helper safely extracts a plain string for rendering. */
function bqStr(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && "value" in (val as object))
    return String((val as { value: unknown }).value);
  return String(val);
}

interface RosterEntry {
  traineeId: string;
  batchId?: string;
  batchName?: string;
  courseName?: string;
  name: string;
  email: string;
  initials: string;
  status: AttendanceStatus;
  remark: string;
}

export default function Attendance() {
  const location = useLocation();
  const requestedBatchId = (location.state as { batchId?: string } | null)?.batchId;

  const [batches, setBatches] = useState<BackendBatchItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");

  const [trainees, setTrainees] = useState<TraineeListItem[]>([]);
  const [loadingTrainees, setLoadingTrainees] = useState(false);
  const [roster, setRoster] = useState<RosterEntry[]>([]);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [finalized, setFinalized] = useState<Record<string, boolean>>({});

  // 1. Fetch real batches from BigQuery
  useEffect(() => {
    let mounted = true;
    async function loadBatches() {
      try {
        setLoadingBatches(true);
        const data = await getTrainerBatchesApi();
        if (!mounted) return;
        setBatches(data);

        // If requestedBatchId matches a real batch, select it; otherwise default to "all" (All Courses)
        if (requestedBatchId && data.some((b) => b.id === requestedBatchId)) {
          setSelectedBatchId(requestedBatchId);
        } else {
          setSelectedBatchId("all");
        }
      } catch (err) {
        console.error("Failed to load batches for attendance:", err);
        toast.error("Failed to load batches");
      } finally {
        if (mounted) setLoadingBatches(false);
      }
    }
    loadBatches();
    return () => {
      mounted = false;
    };
  }, [requestedBatchId]);

  const isAllSelected = selectedBatchId === "all";

  const selectedBatch = useMemo(
    () => batches.find((b) => b.id === selectedBatchId),
    [batches, selectedBatchId]
  );

  // 2. Fetch real enrolled trainees & existing attendance whenever selectedBatchId changes
  const fetchTrainees = useCallback(async (batchId: string, currentBatches: BackendBatchItem[]) => {
    if (!batchId) {
      setTrainees([]);
      setRoster([]);
      return;
    }
    try {
      setLoadingTrainees(true);
      const todayStr = new Date().toISOString().split("T")[0];

      if (batchId === "all") {
        // Fetch ALL trainees for all trainer batches
        const [res, attRes] = await Promise.all([
          getTraineesApi({ limit: 100 }),
          getAttendanceByBatchApi("all").catch(() => null),
        ]);

        const list = res.data?.trainees || [];
        setTrainees(list);

        // Map existing attendance for today
        const attMap = new Map<string, { status: AttendanceStatus; remark: string }>();
        const attList: any[] = attRes?.attendance?.data || attRes?.attendance || [];

        for (const rec of attList) {
          const recDate = rec.sessionDate || (rec.createdAt ? String(rec.createdAt).split("T")[0] : "");
          if (recDate === todayStr) {
            const s = String(rec.status || rec.attendance || "").toLowerCase();
            let st: AttendanceStatus = "P";
            if (s === "absent") st = "A";
            else if (s === "late") st = "L";

            if (rec.userId && rec.batchId) {
              attMap.set(`${rec.userId}_${rec.batchId}`, { status: st, remark: rec.remark || "" });
            }
            if (rec.userId && !attMap.has(rec.userId)) {
              attMap.set(rec.userId, { status: st, remark: rec.remark || "" });
            }
          }
        }

        // Initialize roster with all enrolled trainees across batches
        const newRoster: RosterEntry[] = list.map((t) => {
          const displayName = t.name || (t as any).fullName || "Trainee";
          const initials = displayName
            .split(" ")
            .filter(Boolean)
            .map((n: string) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "TR";

          const bId = t.batchId || "";
          const parentBatch = currentBatches.find((b) => b.id === bId);
          const bName = t.batchName || parentBatch?.batchName || "Batch";
          const cName = t.courseName || (t as any).course?.courseName || parentBatch?.course?.courseName || "General Course";

          const existing = attMap.get(`${t.id}_${bId}`) || attMap.get(t.id);
          return {
            traineeId: t.id || (t as any).traineeId || "",
            batchId: bId,
            batchName: bName,
            courseName: cName,
            name: displayName,
            email: t.email || "",
            initials,
            status: existing?.status || "P",
            remark: existing?.remark || "",
          };
        });
        setRoster(newRoster);
      } else {
        // Scoped to specific batch
        const [res, attRes] = await Promise.all([
          getTraineesApi({ batchId }),
          getAttendanceByBatchApi(batchId).catch(() => null),
        ]);

        const list = res.data?.trainees || [];
        setTrainees(list);

        // Map existing attendance for today
        const attMap = new Map<string, { status: AttendanceStatus; remark: string }>();
        const attList: any[] = attRes?.attendance?.data || attRes?.attendance || [];
        let hasTodayRecord = false;

        for (const rec of attList) {
          const recDate = rec.sessionDate || (rec.createdAt ? String(rec.createdAt).split("T")[0] : "");
          if (recDate === todayStr) {
            hasTodayRecord = true;
            const s = String(rec.status || rec.attendance || "").toLowerCase();
            let st: AttendanceStatus = "P";
            if (s === "absent") st = "A";
            else if (s === "late") st = "L";
            attMap.set(rec.userId, { status: st, remark: rec.remark || "" });
          }
        }

        if (hasTodayRecord) {
          setFinalized((prev) => ({ ...prev, [batchId]: true }));
        }

        const parentBatch = currentBatches.find((b) => b.id === batchId);
        const bName = parentBatch?.batchName || "Batch";
        const cName = parentBatch?.course?.courseName || "General Course";

        const newRoster: RosterEntry[] = list.map((t) => {
          const displayName = t.name || (t as any).fullName || "Trainee";
          const initials = displayName
            .split(" ")
            .filter(Boolean)
            .map((n: string) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "TR";

          const existing = attMap.get(t.id || (t as any).traineeId || "");
          return {
            traineeId: t.id || (t as any).traineeId || "",
            batchId,
            batchName: bName,
            courseName: cName,
            name: displayName,
            email: t.email || "",
            initials,
            status: existing?.status || "P",
            remark: existing?.remark || "",
          };
        });
        setRoster(newRoster);
      }
    } catch (err) {
      console.error("Failed to load trainees for batch:", err);
      toast.error("Failed to load trainees for this batch");
      setTrainees([]);
      setRoster([]);
    } finally {
      setLoadingTrainees(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      fetchTrainees(selectedBatchId, batches);
      setQuery("");
      setPage(0);
    }
  }, [selectedBatchId, batches, fetchTrainees]);

  function setStatus(traineeId: string, status: AttendanceStatus, batchId?: string) {
    setRoster((prev) =>
      prev.map((r) => {
        if (r.traineeId === traineeId && (!batchId || r.batchId === batchId)) {
          return { ...r, status };
        }
        return r;
      })
    );
  }

  function setRemark(traineeId: string, remark: string, batchId?: string) {
    setRoster((prev) =>
      prev.map((r) => {
        if (r.traineeId === traineeId && (!batchId || r.batchId === batchId)) {
          return { ...r, remark };
        }
        return r;
      })
    );
  }

  // Save / Finalize Register to BigQuery (only enabled for specific batch)
  async function handleFinalize() {
    if (!selectedBatch || selectedBatchId === "all") return;
    if (roster.length === 0) {
      toast.error("No trainees enrolled in this batch to mark attendance for.");
      return;
    }

    try {
      setSaving(true);
      const courseId = selectedBatch.course?.id || selectedBatch.courseId || "";
      const statusMap: Record<AttendanceStatus, 'present' | 'absent' | 'late'> = {
        P: 'present',
        A: 'absent',
        L: 'late',
      };

      const payload = {
        batchId: selectedBatch.id,
        courseId,
        sessionDate: new Date().toISOString().split("T")[0],
        records: roster.map((r) => ({
          userId: r.traineeId,
          status: statusMap[r.status],
        })),
      };

      await bulkSaveAttendanceApi(payload);
      setFinalized((prev) => ({ ...prev, [selectedBatch.id]: true }));
      toast.success(`Register finalized and saved for ${selectedBatch.batchName}`);
      // Refresh saved attendance
      fetchTrainees(selectedBatch.id, batches);
    } catch (err: any) {
      console.error("Failed to save attendance:", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to save attendance.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  // Filtered rows for search query
  const filteredRoster = useMemo(() => {
    if (!query.trim()) return roster;
    const q = query.toLowerCase();
    return roster.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.batchName && r.batchName.toLowerCase().includes(q)) ||
        (r.courseName && r.courseName.toLowerCase().includes(q))
    );
  }, [roster, query]);

  const totalPages = Math.max(1, Math.ceil(filteredRoster.length / PAGE_SIZE));
  const pageStart = page * PAGE_SIZE;
  const pageRows = filteredRoster.slice(pageStart, pageStart + PAGE_SIZE);

  const counts = useMemo(() => {
    const present = roster.filter((r) => r.status === "P").length;
    const absent = roster.filter((r) => r.status === "A").length;
    const late = roster.filter((r) => r.status === "L").length;
    return { total: roster.length, present, absent, late };
  }, [roster]);

  const attendanceRate =
    counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0;

  const filterBar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <select
        value={selectedBatchId}
        onChange={(e) => setSelectedBatchId(e.target.value)}
        disabled={loadingBatches || batches.length === 0}
        className="h-10 rounded-xl border border-[#F0DED4] bg-white px-3 text-sm text-[#3A2A22] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20"
      >
        {loadingBatches ? (
          <option value="">Loading batches...</option>
        ) : batches.length === 0 ? (
          <option value="">No batches available</option>
        ) : (
          <>
            <option value="all">All Courses</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchName} — {b.course?.courseName || "Course"}
              </option>
            ))}
          </>
        )}
      </select>
      <span className="text-xs text-[#B7A79D]">
        {batches.length} batch{batches.length === 1 ? "" : "es"} available
      </span>
    </div>
  );

  if (loadingBatches) {
    return (
      <div className="space-y-5">
        <p className="p-8 text-center text-sm text-[#B7A79D]">Loading attendance batches...</p>
      </div>
    );
  }

  if (!selectedBatch && !isAllSelected) {
    return (
      <div className="space-y-5">
        {filterBar}
        <Card>
          <CardContent className="py-10 text-center text-sm text-[#B7A79D]">
            No batches are available.
          </CardContent>
        </Card>
      </div>
    );
  }

  const courseName = isAllSelected
    ? "All Courses"
    : selectedBatch?.course?.courseName || "General Course";

  return (
    <div className="space-y-5">
      {filterBar}

      {/* Batch selector horizontal scroll */}
      {batches.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {/* All Courses option as first pill */}
          <button
            key="all"
            onClick={() => setSelectedBatchId("all")}
            className={cn(
              "flex shrink-0 flex-col rounded-xl border px-4 py-3 text-left transition-colors",
              isAllSelected
                ? "border-[#DE896A] bg-[#FBECE7]"
                : "border-[#F5E2DA] bg-white hover:bg-[#FFFBF9]"
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium text-[#3A2A22]">
              <Users className="h-3.5 w-3.5 text-[#DE896A]" /> All Courses
            </span>
            <span className="mt-1 text-xs text-[#B7A79D]">
              {batches.length} active batches
            </span>
          </button>

          {batches.map((b, idx) => {
            const isActive = b.id === selectedBatchId;
            return (
              <button
                key={`${b.id}-${idx}`}
                onClick={() => setSelectedBatchId(b.id)}
                className={cn(
                  "flex shrink-0 flex-col rounded-xl border px-4 py-3 text-left transition-colors",
                  isActive
                    ? "border-[#DE896A] bg-[#FBECE7]"
                    : "border-[#F5E2DA] bg-white hover:bg-[#FFFBF9]"
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-[#3A2A22]">
                  <Users className="h-3.5 w-3.5 text-[#DE896A]" /> {b.batchName}
                </span>
                <span className="mt-1 text-xs text-[#B7A79D]">
                  {b.course?.courseName || "Course"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left Side: Trainee List */}
        <div className="space-y-5 lg:col-span-2">
          {/* Header card */}
          <Card className="relative overflow-hidden border-[#F0DAC9]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FDF1EA] via-[#FBECE7] to-[#F5D1C4]" />
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#EEAF9C]/30 blur-2xl" />
            <div className="absolute -bottom-14 right-24 h-32 w-32 rounded-full bg-[#DE896A]/20 blur-2xl" />
            <CardContent className="relative p-6">
              <div className="flex flex-wrap gap-2">
                {isAllSelected ? (
                  <>
                    <Badge tone="orange">ALL COURSES</Badge>
                    <Badge tone="neutral">{batches.length} ACTIVE BATCHES</Badge>
                  </>
                ) : (
                  <>
                    <Badge tone="orange">BATCH {bqStr(selectedBatch?.batchName)}</Badge>
                    {selectedBatch?.startDate && (
                      <Badge tone="neutral">Started {bqStr(selectedBatch.startDate)}</Badge>
                    )}
                  </>
                )}
              </div>
              <h1 className="mt-3 text-2xl font-bold text-[#3A2A22]">
                {isAllSelected ? "All Courses Attendance" : courseName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#6B5A52]">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[#C26D4D]" /> Today, {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                {!isAllSelected && selectedBatch?.endDate && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#C26D4D]" /> Ends: {bqStr(selectedBatch.endDate)}
                  </span>
                )}
                {isAllSelected && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[#C26D4D]" /> {counts.total} Enrolled Trainees Across All Batches
                  </span>
                )}
              </div>
              <div className="mt-4 max-w-sm">
                <div className="flex items-center justify-between text-xs text-[#8C7A70]">
                  <span>{isAllSelected ? "Overall Attendance Today" : "Batch Attendance Today"}</span>
                  <span className="font-semibold text-[#3A2A22]">{attendanceRate}%</span>
                </div>
                <ProgressBar value={attendanceRate} className="mt-1.5" />
              </div>
            </CardContent>
          </Card>

          {/* Stat pills */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#F5E2DA] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#B7A79D]">
                Total Trainees
              </p>
              <p className="mt-1 text-2xl font-bold text-[#3A2A22]">{counts.total}</p>
            </div>
            <div className="rounded-2xl bg-[#DE896A] p-4 text-white shadow-sm shadow-[#DE896A]/30">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/80">
                Present
              </p>
              <p className="mt-1 text-2xl font-bold">{counts.present}</p>
            </div>
            <div className="rounded-2xl border border-[#F5E2DA] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#B7A79D]">
                Absent
              </p>
              <p className="mt-1 text-2xl font-bold text-[#3A2A22]">{counts.absent}</p>
            </div>
            <div className="rounded-2xl border border-[#F5E2DA] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#B7A79D]">Late</p>
              <p className="mt-1 text-2xl font-bold text-[#3A2A22]">{counts.late}</p>
            </div>
          </div>

          {/* Roster */}
          <Card>
            <div className="flex flex-col gap-3 border-b border-[#F5E2DA] p-5 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-[#3A2A22]">
                {isAllSelected ? "All Trainees Roster" : "Trainee Roster"}
              </h2>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Filter roster..."
                  className="h-9 w-full rounded-xl border border-[#F0DED4] bg-[#FFFBF9] pl-9 pr-3 text-sm text-[#3A2A22] placeholder:text-[#C7B6AC] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20 sm:w-56"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-[#B7A79D]">
                    <th className="px-5 py-3">Trainee</th>
                    {isAllSelected && <th className="px-5 py-3">Batch & Course</th>}
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5E2DA]">
                  {loadingTrainees ? (
                    <tr>
                      <td colSpan={isAllSelected ? 4 : 3} className="px-5 py-8 text-center text-sm text-[#B7A79D]">
                        Loading enrolled trainees...
                      </td>
                    </tr>
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={isAllSelected ? 4 : 3} className="px-5 py-8 text-center text-sm text-[#B7A79D]">
                        {roster.length === 0
                          ? isAllSelected
                            ? "No trainees enrolled across your batches."
                            : "No trainees enrolled in this batch yet."
                          : "No trainees match your filter."}
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row, idx) => (
                      <tr key={`${row.traineeId}_${row.batchId || selectedBatchId}_${idx}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar initials={row.initials} />
                            <div>
                              <p className="font-medium text-[#3A2A22]">{row.name}</p>
                              <p className="text-xs text-[#B7A79D]">{row.email}</p>
                            </div>
                          </div>
                        </td>
                        {isAllSelected && (
                          <td className="px-5 py-3">
                            <p className="font-medium text-[#3A2A22]">{row.batchName}</p>
                            <p className="text-xs text-[#8C7A70]">{row.courseName}</p>
                          </td>
                        )}
                        <td className="px-5 py-3">
                          <div className="inline-flex overflow-hidden rounded-lg border border-[#F0DED4]">
                            {STATUS_OPTIONS.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => setStatus(row.traineeId, opt, row.batchId)}
                                className={cn(
                                  "h-8 w-9 text-xs font-semibold transition-colors",
                                  row.status === opt
                                    ? "bg-[#DE896A] text-white"
                                    : "bg-white text-[#8C7A70] hover:bg-[#FBECE7]"
                                )}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <input
                            value={row.remark}
                            onChange={(e) => setRemark(row.traineeId, e.target.value, row.batchId)}
                            placeholder="Add note..."
                            className="h-8 w-full max-w-[220px] rounded-lg border border-transparent bg-transparent px-2 text-sm text-[#3A2A22] placeholder:text-[#C7B6AC] hover:border-[#F0DED4] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-[#F5E2DA] px-5 py-3 text-xs text-[#8C7A70]">
              <span>
                Showing {Math.min(pageRows.length, PAGE_SIZE)} of {filteredRoster.length} trainees
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[#FBECE7] disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[#FBECE7] disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column: Status & Finalize */}
        <div className="space-y-5">
          <Card className="overflow-hidden border-none bg-gradient-to-br from-[#E38F6C] to-[#C26D4D] text-white">
            <CardContent className="p-6 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                Session Status
              </p>
              <p className="mt-1 text-sm text-white/80">
                {isAllSelected
                  ? "Overall Attendance Rate"
                  : `Attendance Rate — ${selectedBatch?.batchName}`}
              </p>

              <div className="my-5 flex justify-center">
                <RadialProgress
                  value={attendanceRate}
                  size={112}
                  strokeWidth={9}
                  label={`${attendanceRate}%`}
                />
              </div>

              {isAllSelected ? (
                <div className="rounded-xl bg-white/20 px-3 py-2.5 text-xs font-medium text-white/90">
                  Select a specific batch to record or finalize register.
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleFinalize}
                  disabled={saving || (selectedBatch && finalized[selectedBatch.id]) || roster.length === 0}
                  className="w-full justify-center border-white/40 bg-white text-[#8A442E] hover:bg-white/90 disabled:opacity-90 disabled:cursor-not-allowed"
                >
                  <CheckSquare className="h-4 w-4" />{" "}
                  {saving
                    ? "Saving..."
                    : selectedBatch && finalized[selectedBatch.id]
                    ? "Register Finalized"
                    : "Finalize Register"}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <div className="flex items-center justify-between border-b border-[#F5E2DA] p-5">
              <h2 className="text-base font-semibold text-[#3A2A22]">
                {isAllSelected ? "All Courses Overview" : `Batch Info — ${selectedBatch?.batchName}`}
              </h2>
            </div>
            <CardContent className="space-y-4 p-5 text-sm">
              {isAllSelected ? (
                <>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#B7A79D]">Active Batches</p>
                    <p className="font-medium text-[#3A2A22]">{batches.length} batches</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#B7A79D]">Total Enrollments</p>
                    <p className="font-medium text-[#3A2A22]">{counts.total} trainees</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#B7A79D]">Present Today</p>
                    <p className="font-medium text-[#3A2A22]">{counts.present} trainees</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#B7A79D]">Attendance Rate</p>
                    <p className="font-medium text-[#3A2A22]">{attendanceRate}%</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#B7A79D]">Course</p>
                    <p className="font-medium text-[#3A2A22]">{courseName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#B7A79D]">Enrolled Trainees</p>
                    <p className="font-medium text-[#3A2A22]">{roster.length} trainees</p>
                  </div>
                  {selectedBatch?.startDate && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-[#B7A79D]">Start Date</p>
                      <p className="font-medium text-[#3A2A22]">{bqStr(selectedBatch.startDate)}</p>
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
