import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  CheckSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  CalendarDays,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { RadialProgress, ProgressBar } from "@/components/ui/ProgressBar";
import {
  offlineBatches,
  attendanceForBatch,
  traineesForBatch,
  scheduleForBatch,
  courseById,
} from "@/data/mockData";
import type { AttendanceRow, AttendanceStatus } from "@/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 4;
const STATUS_OPTIONS: AttendanceStatus[] = ["P", "A", "L"];

export default function Attendance() {
  const location = useLocation();
  // Every offline batch, across every course — attendance only exists here,
  // never for a self-paced online batch, so this is the full universe of
  // batches this page can ever show.
  const allBatches = useMemo(() => offlineBatches(), []);
  const requestedBatchId = (location.state as { batchId?: string } | null)?.batchId;
  const requestedBatch = requestedBatchId ? allBatches.find((b) => b.id === requestedBatchId) : undefined;
  const initialBatchId = requestedBatch ? requestedBatch.id : allBatches[0]?.id ?? "";
  const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId);

  // Attendance is taken per batch, so the batch itself is the filter —
  // every offline batch is always in play, no course-level narrowing.
  const filteredBatches = allBatches;

  // Deep-linking in from My Courses ("Mark Attendance" on a specific batch)
  // should jump straight to that batch even if this page was already mounted.
  useEffect(() => {
    if (requestedBatchId && allBatches.some((b) => b.id === requestedBatchId)) {
      setSelectedBatchId(requestedBatchId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedBatchId]);

  // Each offline batch keeps its own roster — edits to one batch's P/A/L
  // marks never bleed into another batch's attendance.
  const [rosterByBatch, setRosterByBatch] = useState<Record<string, AttendanceRow[]>>(() =>
    Object.fromEntries(allBatches.map((b) => [b.id, attendanceForBatch(b.id)]))
  );

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    setQuery("");
    setPage(0);
  }, [selectedBatchId]);

  const batch = allBatches.find((b) => b.id === selectedBatchId);
  const course = batch ? courseById(batch.courseId) : undefined;
  const roster = rosterByBatch[selectedBatchId] ?? [];
  const batchTrainees = useMemo(
    () => (batch ? traineesForBatch(batch.id) : []),
    [batch]
  );
  const scheduleItems = batch ? scheduleForBatch(batch.id) : [];

  const rosterTrainees = useMemo(
    () =>
      roster
        .map((r) => ({ ...r, trainee: batchTrainees.find((t) => t.id === r.traineeId)! }))
        .filter((r) => r.trainee)
        .filter((r) =>
          query.trim()
            ? r.trainee.name.toLowerCase().includes(query.toLowerCase()) ||
              r.trainee.trainerId.toLowerCase().includes(query.toLowerCase())
            : true
        ),
    [roster, batchTrainees, query]
  );

  const totalPages = Math.max(1, Math.ceil(rosterTrainees.length / PAGE_SIZE));
  const pageStart = page * PAGE_SIZE;
  const pageRows = rosterTrainees.slice(pageStart, pageStart + PAGE_SIZE);

  const counts = useMemo(() => {
    const present = roster.filter((r) => r.status === "P").length;
    const absent = roster.filter((r) => r.status === "A").length;
    const late = roster.filter((r) => r.status === "L").length;
    return { total: roster.length, present, absent, late };
  }, [roster]);

  const attendanceRate = counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0;

  function setStatus(traineeId: string, status: AttendanceStatus) {
    setRosterByBatch((prev) => ({
      ...prev,
      [selectedBatchId]: (prev[selectedBatchId] ?? []).map((r) =>
        r.traineeId === traineeId ? { ...r, status } : r
      ),
    }));
  }

  function setRemark(traineeId: string, remark: string) {
    setRosterByBatch((prev) => ({
      ...prev,
      [selectedBatchId]: (prev[selectedBatchId] ?? []).map((r) =>
        r.traineeId === traineeId ? { ...r, remark } : r
      ),
    }));
  }

  const [finalized, setFinalized] = useState<Record<string, boolean>>({});

  function handleFinalize() {
    if (!batch) return;
    setFinalized((prev) => ({ ...prev, [batch.id]: true }));
    toast.success(`Register finalized for ${batch.code}`);
  }

  const filterBar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <select
        value={selectedBatchId}
        onChange={(e) => setSelectedBatchId(e.target.value)}
        className="h-10 rounded-xl border border-[#F0DED4] bg-white px-3 text-sm text-[#3A2A22] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20"
      >
        {allBatches.map((b) => {
          const c = courseById(b.courseId);
          return (
            <option key={b.id} value={b.id}>
              {b.code} · {b.label} — {c?.name}
            </option>
          );
        })}
      </select>
      <span className="text-xs text-[#B7A79D]">
        {filteredBatches.length} offline batch{filteredBatches.length === 1 ? "" : "es"}
      </span>
    </div>
  );

  if (!batch || !course) {
    return (
      <div className="space-y-5">
        {filterBar}
        <Card>
          <CardContent className="py-10 text-center text-sm text-[#B7A79D]">No offline batches are assigned yet.</CardContent>
        </Card>
      </div>
    );
  }

  const [datePart, timePart] = (batch.nextSession ?? "").split(", ");

  return (
    <div className="space-y-5">
      {filterBar}

      {/* Batch selector — the same course can run as more than one batch */}
      {filteredBatches.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {filteredBatches.map((b) => {
            const c = courseById(b.courseId);
            const isActive = b.id === selectedBatchId;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBatchId(b.id)}
                className={cn(
                  "flex shrink-0 flex-col rounded-xl border px-4 py-3 text-left transition-colors",
                  isActive ? "border-[#DE896A] bg-[#FBECE7]" : "border-[#F5E2DA] bg-white hover:bg-[#FFFBF9]"
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-[#3A2A22]">
                  <Users className="h-3.5 w-3.5 text-[#DE896A]" /> {b.code} · {b.label}
                </span>
                <span className="mt-1 text-xs text-[#B7A79D]">
                  {c?.name} — {c?.level} · {traineesForBatch(b.id).length} trainees
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left Side: Trainee List */}
        <div className="space-y-5 lg:col-span-2">
          {/* Batch header card */}
          <Card className="relative overflow-hidden border-[#F0DAC9]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FDF1EA] via-[#FBECE7] to-[#F5D1C4]" />
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#EEAF9C]/30 blur-2xl" />
            <div className="absolute -bottom-14 right-24 h-32 w-32 rounded-full bg-[#DE896A]/20 blur-2xl" />
            <CardContent className="relative p-6">
              <div className="flex flex-wrap gap-2">
                <Badge tone="neutral">{course.category.toUpperCase()}</Badge>
                <Badge tone="orange">BATCH {batch.code}</Badge>
                <Badge tone="neutral">{batch.label}</Badge>
              </div>
              <h1 className="mt-3 text-2xl font-bold text-[#3A2A22]">
                {course.name} <span className="text-[#8C7A70]">— {course.level}</span>
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#6B5A52]">
                {datePart && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-[#C26D4D]" /> {datePart}
                  </span>
                )}
                {timePart && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#C26D4D]" /> {timePart}
                  </span>
                )}
                {batch.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#C26D4D]" /> {batch.location}
                  </span>
                )}
              </div>
              <div className="mt-4 max-w-sm">
                <div className="flex items-center justify-between text-xs text-[#8C7A70]">
                  <span>Batch progress</span>
                  <span className="font-semibold text-[#3A2A22]">{batch.progress}%</span>
                </div>
                <ProgressBar value={batch.progress} className="mt-1.5" />
              </div>
            </CardContent>
          </Card>

          {/* Stat pills */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#F5E2DA] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#B7A79D]">Total Trainees</p>
              <p className="mt-1 text-2xl font-bold text-[#3A2A22]">{counts.total}</p>
            </div>
            <div className="rounded-2xl bg-[#DE896A] p-4 text-white shadow-sm shadow-[#DE896A]/30">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/80">Present</p>
              <p className="mt-1 text-2xl font-bold">{counts.present}</p>
            </div>
            <div className="rounded-2xl border border-[#F5E2DA] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#B7A79D]">Absent</p>
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
              <h2 className="text-base font-semibold text-[#3A2A22]">Trainee Roster</h2>
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
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5E2DA]">
                  {pageRows.map((row) => (
                    <tr key={row.traineeId}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar initials={row.trainee.initials} />
                          <div>
                            <p className="font-medium text-[#3A2A22]">{row.trainee.name}</p>
                            <p className="flex items-center gap-1.5 text-xs text-[#B7A79D]">
                              ID: {row.trainee.trainerId}
                              {batch && course && (
                                <>
                                  <span>· {batch.code}</span>
                                  <Badge tone={batch.mode === "online" ? "blue" : "amber"} className="scale-75 origin-left px-1.5 py-0">
                                    {batch.mode}
                                  </Badge>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="inline-flex overflow-hidden rounded-lg border border-[#F0DED4]">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => setStatus(row.traineeId, opt)}
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
                          onChange={(e) => setRemark(row.traineeId, e.target.value)}
                          placeholder="Add note..."
                          className="h-8 w-full max-w-[220px] rounded-lg border border-transparent bg-transparent px-2 text-sm text-[#3A2A22] placeholder:text-[#C7B6AC] hover:border-[#F0DED4] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-[#F5E2DA] px-5 py-3 text-xs text-[#8C7A70]">
              <span>
                Showing {Math.min(pageRows.length, PAGE_SIZE)} of {rosterTrainees.length} trainees
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

        {/* Right column */}
        <div className="space-y-5">
          <Card className="overflow-hidden border-none bg-gradient-to-br from-[#E38F6C] to-[#C26D4D] text-white">
            <CardContent className="p-6 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Session Status</p>
              <p className="mt-1 text-sm text-white/80">Attendance Rate — {batch.code}</p>

              <div className="my-5 flex justify-center">
                <RadialProgress value={attendanceRate} size={112} strokeWidth={9} label={`${attendanceRate}%`} />
              </div>

              <Button
                variant="outline"
                onClick={handleFinalize}
                disabled={batch ? finalized[batch.id] : false}
                className="w-full justify-center border-white/40 bg-white text-[#8A442E] hover:bg-white/90 disabled:opacity-90 disabled:cursor-not-allowed"
              >
                <CheckSquare className="h-4 w-4" /> {(batch && finalized[batch.id]) ? "Register Finalized" : "Finalize Register"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <div className="flex items-center justify-between border-b border-[#F5E2DA] p-5">
              <h2 className="text-base font-semibold text-[#3A2A22]">Schedule — {batch.code}</h2>
              <button className="text-[#B7A79D] hover:text-[#DE896A]">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
            <CardContent className="space-y-4 p-5">
              {scheduleItems.length === 0 && (
                <p className="text-sm text-[#B7A79D]">No sessions scheduled for this batch yet.</p>
              )}
              {scheduleItems.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div
                    className={cn(
                      "mt-1 h-2 w-2 shrink-0 rounded-full",
                      item.isToday ? "bg-[#DE896A]" : "bg-[#E9D6CC]"
                    )}
                  />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-xs font-bold uppercase tracking-wide",
                        item.isToday ? "text-[#DE896A]" : "text-[#B7A79D]"
                      )}
                    >
                      {item.date} · {item.time}
                    </p>
                    <p className="truncate text-sm font-medium text-[#3A2A22]">{item.title}</p>
                    <p className="truncate text-xs text-[#8C7A70]">{item.description}</p>
                  </div>
                </div>
              ))}
              <button className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#F0DED4] py-2 text-xs font-medium text-[#8A442E] hover:bg-[#FBECE7]">
                <CalendarDays className="h-3.5 w-3.5" /> View Full Calendar
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
