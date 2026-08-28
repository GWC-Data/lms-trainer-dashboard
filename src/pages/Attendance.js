import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Calendar, Clock, MapPin, CheckSquare, Search, ChevronLeft, ChevronRight, MoreHorizontal, CalendarDays, Users, } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { RadialProgress, ProgressBar } from "@/components/ui/ProgressBar";
import { offlineBatches, attendanceForBatch, traineesForBatch, scheduleForBatch, courseById, } from "@/data/mockData";
import { cn } from "@/lib/utils";
const PAGE_SIZE = 4;
const STATUS_OPTIONS = ["P", "A", "L"];
export default function Attendance() {
    const location = useLocation();
    const batches = useMemo(() => offlineBatches(), []);
    const requestedBatchId = location.state?.batchId;
    const initialBatchId = requestedBatchId && batches.some((b) => b.id === requestedBatchId) ? requestedBatchId : batches[0]?.id ?? "";
    const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId);
    // Deep-linking in from My Courses ("Mark Attendance" on a specific batch)
    // should jump straight to that batch even if this page was already mounted.
    useEffect(() => {
        if (requestedBatchId && batches.some((b) => b.id === requestedBatchId)) {
            setSelectedBatchId(requestedBatchId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestedBatchId]);
    // Each offline batch keeps its own roster — edits to one batch's P/A/L
    // marks never bleed into another batch's attendance.
    const [rosterByBatch, setRosterByBatch] = useState(() => Object.fromEntries(batches.map((b) => [b.id, attendanceForBatch(b.id)])));
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(0);
    useEffect(() => {
        setQuery("");
        setPage(0);
    }, [selectedBatchId]);
    const batch = batches.find((b) => b.id === selectedBatchId);
    const course = batch ? courseById(batch.courseId) : undefined;
    const roster = rosterByBatch[selectedBatchId] ?? [];
    const batchTrainees = useMemo(() => (batch ? traineesForBatch(batch.id) : []), [batch]);
    const scheduleItems = batch ? scheduleForBatch(batch.id) : [];
    const rosterTrainees = useMemo(() => roster
        .map((r) => ({ ...r, trainee: batchTrainees.find((t) => t.id === r.traineeId) }))
        .filter((r) => r.trainee)
        .filter((r) => query.trim()
        ? r.trainee.name.toLowerCase().includes(query.toLowerCase()) ||
            r.trainee.trainerId.toLowerCase().includes(query.toLowerCase())
        : true), [roster, batchTrainees, query]);
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
    function setStatus(traineeId, status) {
        setRosterByBatch((prev) => ({
            ...prev,
            [selectedBatchId]: (prev[selectedBatchId] ?? []).map((r) => r.traineeId === traineeId ? { ...r, status } : r),
        }));
    }
    function setRemark(traineeId, remark) {
        setRosterByBatch((prev) => ({
            ...prev,
            [selectedBatchId]: (prev[selectedBatchId] ?? []).map((r) => r.traineeId === traineeId ? { ...r, remark } : r),
        }));
    }
    if (!batch || !course) {
        return (_jsx(Card, { children: _jsx(CardContent, { className: "py-10 text-center text-sm text-[#B7A79D]", children: "No offline batches are assigned yet." }) }));
    }
    const [datePart, timePart] = (batch.nextSession ?? "").split(", ");
    return (_jsxs("div", { className: "space-y-5", children: [batches.length > 1 && (_jsx("div", { className: "flex gap-3 overflow-x-auto pb-1", children: batches.map((b) => {
                    const c = courseById(b.courseId);
                    const isActive = b.id === selectedBatchId;
                    return (_jsxs("button", { onClick: () => setSelectedBatchId(b.id), className: cn("flex shrink-0 flex-col rounded-xl border px-4 py-3 text-left transition-colors", isActive ? "border-[#DE896A] bg-[#FBECE7]" : "border-[#F5E2DA] bg-white hover:bg-[#FFFBF9]"), children: [_jsxs("span", { className: "flex items-center gap-1.5 text-sm font-medium text-[#3A2A22]", children: [_jsx(Users, { className: "h-3.5 w-3.5 text-[#DE896A]" }), " ", b.code, " \u00B7 ", b.label] }), _jsxs("span", { className: "mt-1 text-xs text-[#B7A79D]", children: [c?.name, " \u2014 ", c?.level, " \u00B7 ", traineesForBatch(b.id).length, " trainees"] })] }, b.id));
                }) })), _jsxs("div", { className: "grid grid-cols-1 gap-5 xl:grid-cols-3", children: [_jsxs("div", { className: "space-y-5 xl:col-span-2", children: [_jsxs(Card, { className: "relative overflow-hidden border-[#F0DAC9]", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-br from-[#FDF1EA] via-[#FBECE7] to-[#F5D1C4]" }), _jsx("div", { className: "absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#EEAF9C]/30 blur-2xl" }), _jsx("div", { className: "absolute -bottom-14 right-24 h-32 w-32 rounded-full bg-[#DE896A]/20 blur-2xl" }), _jsxs(CardContent, { className: "relative p-6", children: [_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Badge, { tone: "neutral", children: course.category.toUpperCase() }), _jsxs(Badge, { tone: "orange", children: ["BATCH ", batch.code] }), _jsx(Badge, { tone: "neutral", children: batch.label })] }), _jsxs("h1", { className: "mt-3 text-2xl font-bold text-[#3A2A22]", children: [course.name, " ", _jsxs("span", { className: "text-[#8C7A70]", children: ["\u2014 ", course.level] })] }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#6B5A52]", children: [datePart && (_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Calendar, { className: "h-4 w-4 text-[#C26D4D]" }), " ", datePart] })), timePart && (_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Clock, { className: "h-4 w-4 text-[#C26D4D]" }), " ", timePart] })), batch.location && (_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(MapPin, { className: "h-4 w-4 text-[#C26D4D]" }), " ", batch.location] }))] }), _jsxs("div", { className: "mt-4 max-w-sm", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-[#8C7A70]", children: [_jsx("span", { children: "Batch progress" }), _jsxs("span", { className: "font-semibold text-[#3A2A22]", children: [batch.progress, "%"] })] }), _jsx(ProgressBar, { value: batch.progress, className: "mt-1.5" })] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-4", children: [_jsxs("div", { className: "rounded-2xl border border-[#F5E2DA] bg-white p-4", children: [_jsx("p", { className: "text-[10px] font-bold uppercase tracking-wide text-[#B7A79D]", children: "Total Trainees" }), _jsx("p", { className: "mt-1 text-2xl font-bold text-[#3A2A22]", children: counts.total })] }), _jsxs("div", { className: "rounded-2xl bg-[#DE896A] p-4 text-white shadow-sm shadow-[#DE896A]/30", children: [_jsx("p", { className: "text-[10px] font-bold uppercase tracking-wide text-white/80", children: "Present" }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: counts.present })] }), _jsxs("div", { className: "rounded-2xl border border-[#F5E2DA] bg-white p-4", children: [_jsx("p", { className: "text-[10px] font-bold uppercase tracking-wide text-[#B7A79D]", children: "Absent" }), _jsx("p", { className: "mt-1 text-2xl font-bold text-[#3A2A22]", children: counts.absent })] }), _jsxs("div", { className: "rounded-2xl border border-[#F5E2DA] bg-white p-4", children: [_jsx("p", { className: "text-[10px] font-bold uppercase tracking-wide text-[#B7A79D]", children: "Late" }), _jsx("p", { className: "mt-1 text-2xl font-bold text-[#3A2A22]", children: counts.late })] })] }), _jsxs(Card, { children: [_jsxs("div", { className: "flex flex-col gap-3 border-b border-[#F5E2DA] p-5 sm:flex-row sm:items-center sm:justify-between", children: [_jsx("h2", { className: "text-base font-semibold text-[#3A2A22]", children: "Trainee Roster" }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" }), _jsx("input", { value: query, onChange: (e) => {
                                                            setQuery(e.target.value);
                                                            setPage(0);
                                                        }, placeholder: "Filter roster...", className: "h-9 w-full rounded-xl border border-[#F0DED4] bg-[#FFFBF9] pl-9 pr-3 text-sm text-[#3A2A22] placeholder:text-[#C7B6AC] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20 sm:w-56" })] })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-[10px] font-bold uppercase tracking-wide text-[#B7A79D]", children: [_jsx("th", { className: "px-5 py-3", children: "Trainee" }), _jsx("th", { className: "px-5 py-3", children: "Status" }), _jsx("th", { className: "px-5 py-3", children: "Remarks" })] }) }), _jsx("tbody", { className: "divide-y divide-[#F5E2DA]", children: pageRows.map((row) => (_jsxs("tr", { children: [_jsx("td", { className: "px-5 py-3", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Avatar, { initials: row.trainee.initials }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-[#3A2A22]", children: row.trainee.name }), _jsxs("p", { className: "flex items-center gap-1.5 text-xs text-[#B7A79D]", children: ["ID: ", row.trainee.trainerId, batch && course && (_jsxs(_Fragment, { children: [_jsxs("span", { children: ["\u00B7 ", batch.code] }), _jsx(Badge, { tone: course.mode === "online" ? "blue" : "amber", className: "scale-75 origin-left px-1.5 py-0", children: course.mode })] }))] })] })] }) }), _jsx("td", { className: "px-5 py-3", children: _jsx("div", { className: "inline-flex overflow-hidden rounded-lg border border-[#F0DED4]", children: STATUS_OPTIONS.map((opt) => (_jsx("button", { onClick: () => setStatus(row.traineeId, opt), className: cn("h-8 w-9 text-xs font-semibold transition-colors", row.status === opt
                                                                            ? "bg-[#DE896A] text-white"
                                                                            : "bg-white text-[#8C7A70] hover:bg-[#FBECE7]"), children: opt }, opt))) }) }), _jsx("td", { className: "px-5 py-3", children: _jsx("input", { value: row.remark, onChange: (e) => setRemark(row.traineeId, e.target.value), placeholder: "Add note...", className: "h-8 w-full max-w-[220px] rounded-lg border border-transparent bg-transparent px-2 text-sm text-[#3A2A22] placeholder:text-[#C7B6AC] hover:border-[#F0DED4] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20" }) })] }, row.traineeId))) })] }) }), _jsxs("div", { className: "flex items-center justify-between border-t border-[#F5E2DA] px-5 py-3 text-xs text-[#8C7A70]", children: [_jsxs("span", { children: ["Showing ", Math.min(pageRows.length, PAGE_SIZE), " of ", rosterTrainees.length, " trainees"] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => setPage((p) => Math.max(0, p - 1)), disabled: page === 0, className: "flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[#FBECE7] disabled:opacity-30", children: _jsx(ChevronLeft, { className: "h-4 w-4" }) }), _jsx("button", { onClick: () => setPage((p) => Math.min(totalPages - 1, p + 1)), disabled: page >= totalPages - 1, className: "flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[#FBECE7] disabled:opacity-30", children: _jsx(ChevronRight, { className: "h-4 w-4" }) })] })] })] })] }), _jsxs("div", { className: "space-y-5", children: [_jsx(Card, { className: "overflow-hidden border-none bg-gradient-to-br from-[#E38F6C] to-[#C26D4D] text-white", children: _jsxs(CardContent, { className: "p-6", children: [_jsx("p", { className: "text-[11px] font-bold uppercase tracking-wider text-white/80", children: "Session Status" }), _jsxs("p", { className: "mt-1 text-3xl font-bold", children: [attendanceRate, "%"] }), _jsxs("p", { className: "text-sm text-white/80", children: ["Attendance Rate \u2014 ", batch.code] }), _jsx("div", { className: "my-5 flex justify-center", children: _jsx(RadialProgress, { value: attendanceRate, size: 104, strokeWidth: 9 }) }), _jsxs(Button, { variant: "outline", className: "w-full justify-center border-white/40 bg-white text-[#8A442E] hover:bg-white/90", children: [_jsx(CheckSquare, { className: "h-4 w-4" }), " Finalize Register"] })] }) }), _jsxs(Card, { children: [_jsxs("div", { className: "flex items-center justify-between border-b border-[#F5E2DA] p-5", children: [_jsxs("h2", { className: "text-base font-semibold text-[#3A2A22]", children: ["Schedule \u2014 ", batch.code] }), _jsx("button", { className: "text-[#B7A79D] hover:text-[#DE896A]", children: _jsx(MoreHorizontal, { className: "h-4 w-4" }) })] }), _jsxs(CardContent, { className: "space-y-4 p-5", children: [scheduleItems.length === 0 && (_jsx("p", { className: "text-sm text-[#B7A79D]", children: "No sessions scheduled for this batch yet." })), scheduleItems.map((item) => (_jsxs("div", { className: "flex gap-3", children: [_jsx("div", { className: cn("mt-1 h-2 w-2 shrink-0 rounded-full", item.isToday ? "bg-[#DE896A]" : "bg-[#E9D6CC]") }), _jsxs("div", { className: "min-w-0", children: [_jsxs("p", { className: cn("text-xs font-bold uppercase tracking-wide", item.isToday ? "text-[#DE896A]" : "text-[#B7A79D]"), children: [item.date, " \u00B7 ", item.time] }), _jsx("p", { className: "truncate text-sm font-medium text-[#3A2A22]", children: item.title }), _jsx("p", { className: "truncate text-xs text-[#8C7A70]", children: item.description })] })] }, item.id))), _jsxs("button", { className: "flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#F0DED4] py-2 text-xs font-medium text-[#8A442E] hover:bg-[#FBECE7]", children: [_jsx(CalendarDays, { className: "h-3.5 w-3.5" }), " View Full Calendar"] })] })] })] })] })] }));
}
