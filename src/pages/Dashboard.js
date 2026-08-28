import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { BookOpen, Users, ClipboardCheck, UserCheck, ArrowUpRight, MapPin, Laptop, Clock, } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import { courses, batches, trainees, assignments, trainer, batchesForCourse, courseModes, totalTraineesForCourse, avgProgressForCourse, nextSessionForCourse, offlineBatches, attendanceForBatch, scheduleForBatch, batchById, courseById, } from "@/data/mockData";
const activeOfflineBatches = offlineBatches();
const attendanceRates = activeOfflineBatches
    .map((b) => {
    const roster = attendanceForBatch(b.id);
    if (roster.length === 0)
        return null;
    return (roster.filter((r) => r.status === "P").length / roster.length) * 100;
})
    .filter((rate) => rate !== null);
const avgAttendanceRate = attendanceRates.length
    ? Math.round(attendanceRates.reduce((sum, r) => sum + r, 0) / attendanceRates.length)
    : 0;
// Prefer whichever offline batch actually has a session today, so adding
// more offline batches never bumps today's featured session off the card.
const primaryOfflineBatch = activeOfflineBatches.find((b) => scheduleForBatch(b.id).some((s) => s.isToday)) ?? activeOfflineBatches[0];
const stats = [
    {
        label: "Assigned Courses",
        value: courses.length,
        icon: BookOpen,
        hint: `${batches.filter((b) => b.mode === "online").length} online batches · ${batches.filter((b) => b.mode === "offline").length} offline`,
        chip: "bg-[#FBECE7] text-[#DE896A]",
    },
    {
        label: "Total Trainees",
        value: trainees.length,
        icon: Users,
        hint: `${trainees.filter((t) => t.atRisk).length} flagged at-risk`,
        chip: "bg-sky-50 text-sky-700",
    },
    {
        label: "Pending Evaluations",
        value: assignments.reduce((sum, a) => sum + a.pendingReview, 0),
        icon: ClipboardCheck,
        hint: "Assignments awaiting review",
        chip: "bg-violet-50 text-violet-700",
    },
    {
        label: "Avg. Attendance",
        value: `${avgAttendanceRate}%`,
        icon: UserCheck,
        hint: `Across ${activeOfflineBatches.length} offline batch${activeOfflineBatches.length === 1 ? "" : "es"}`,
        chip: "bg-emerald-50 text-emerald-700",
    },
];
export default function Dashboard() {
    const hour = new Date().getHours();
    let greeting = "Good evening";
    if (hour < 12)
        greeting = "Good morning";
    else if (hour < 18)
        greeting = "Good afternoon";
    function isPastSession(item) {
        if (!item.isToday)
            return false;
        const match = item.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match)
            return false;
        let hour = parseInt(match[1]);
        const minute = parseInt(match[2]);
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && hour < 12)
            hour += 12;
        if (ampm === "AM" && hour === 12)
            hour = 0;
        const now = new Date();
        if (now.getHours() > hour)
            return true;
        if (now.getHours() === hour && now.getMinutes() >= minute)
            return true;
        return false;
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("h1", { className: "text-xl font-bold text-[#3A2A22]", children: [greeting, ", ", trainer.name.split(" ")[0]] }), _jsx("p", { className: "text-sm text-[#8C7A70]", children: "Here's what's happening across your assigned courses today." })] }), _jsx("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", children: stats.map((s) => (_jsx(Card, { children: _jsxs(CardContent, { className: "flex items-start justify-between p-5", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-medium uppercase tracking-wide text-[#B7A79D]", children: s.label }), _jsx("p", { className: "mt-1 text-xl font-bold text-[#3A2A22]", children: s.value }), _jsx("p", { className: "mt-1 text-xs text-[#B7A79D]", children: s.hint })] }), _jsx("div", { className: `flex h-10 w-10 items-center justify-center rounded-xl ${s.chip}`, children: _jsx(s.icon, { className: "h-5 w-5" }) })] }) }, s.label))) }), _jsxs("div", { className: "grid grid-cols-1 gap-6 xl:grid-cols-3", children: [_jsxs(Card, { className: "xl:col-span-2", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "My Courses" }), _jsx("p", { className: "mt-1 text-sm text-[#8C7A70]", children: "Assigned courses across both delivery modes" })] }), _jsx(Link, { to: "/courses", children: _jsxs(Button, { variant: "ghost", size: "sm", children: ["View all ", _jsx(ArrowUpRight, { className: "h-3.5 w-3.5" })] }) })] }), _jsx(CardContent, { className: "space-y-3", children: courses.map((c) => {
                                    const courseBatches = batchesForCourse(c.id);
                                    const avgProgress = avgProgressForCourse(c.id);
                                    return (_jsxs("div", { className: "flex flex-col gap-3 rounded-xl border border-[#F5E2DA] p-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { className: "flex min-w-0 flex-1 items-start gap-3", children: [_jsx("span", { className: "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FFFBF9] p-1", children: _jsx("img", { src: c.image, alt: "", className: "h-full w-full object-contain" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("p", { className: "text-sm font-semibold text-[#3A2A22]", children: [c.name, " ", _jsxs("span", { className: "font-normal text-[#B7A79D]", children: ["\u2014 ", c.level] })] }), courseModes(c.id).map((mode) => (_jsxs(Badge, { tone: mode === "online" ? "blue" : "amber", children: [mode === "online" ? _jsx(Laptop, { className: "h-3 w-3" }) : _jsx(MapPin, { className: "h-3 w-3" }), mode] }, mode))), _jsxs(Badge, { tone: "neutral", children: [courseBatches.length, " batch", courseBatches.length === 1 ? "" : "es"] })] }), _jsxs("p", { className: "mt-1 text-xs text-[#B7A79D]", children: [totalTraineesForCourse(c.id), " trainees \u00B7 ", c.domains, " domains \u00B7 ", c.hours, " hrs"] }), _jsxs("div", { className: "mt-2 flex items-center gap-2", children: [_jsx(ProgressBar, { value: avgProgress, className: "max-w-[220px]" }), _jsxs("span", { className: "text-xs font-medium text-[#8C7A70]", children: [avgProgress, "% avg", courseBatches.length > 1 ? ` across ${courseBatches.length} batches` : ""] })] })] })] }), _jsxs("div", { className: "flex items-center gap-1.5 text-xs text-[#8C7A70] sm:flex-col sm:items-end sm:gap-0.5", children: [_jsx(Clock, { className: "h-3.5 w-3.5 sm:hidden" }), _jsx("span", { children: nextSessionForCourse(c.id) })] })] }, c.id));
                                }) })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Upcoming Schedule" }), primaryOfflineBatch && (_jsxs("p", { className: "mt-1 text-xs text-[#B7A79D]", children: ["Batch ", primaryOfflineBatch.code] }))] }), _jsx(CardContent, { className: "space-y-4", children: (primaryOfflineBatch ? scheduleForBatch(primaryOfflineBatch.id) : []).map((item) => {
                                            const isPast = isPastSession(item);
                                            return (_jsxs("div", { className: "flex gap-3", children: [_jsx("div", { className: `mt-1 h-2 w-2 shrink-0 rounded-full ${isPast ? "bg-emerald-500" : item.isToday ? "bg-[#DE896A]" : "bg-[#E9D6CC]"}` }), _jsxs("div", { className: "min-w-0", children: [_jsxs("p", { className: "flex items-center text-xs font-semibold uppercase tracking-wide text-[#B7A79D]", children: [item.date, " \u00B7 ", item.time, isPast && _jsx("span", { className: "ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] text-emerald-600", children: "Completed" })] }), _jsx("p", { className: `truncate text-[13px] font-medium text-[#3A2A22] ${isPast ? "opacity-50 line-through" : ""}`, children: item.title }), _jsx("p", { className: `truncate text-xs text-[#8C7A70] ${isPast ? "opacity-50" : ""}`, children: item.description })] })] }, item.id));
                                        }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Trainees Needing Support" }) }), _jsxs(CardContent, { className: "space-y-3", children: [trainees
                                                .filter((t) => t.atRisk)
                                                .slice(0, 4)
                                                .map((t) => {
                                                const batch = batchById(t.batchId);
                                                const course = courseById(t.courseId);
                                                return (_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-[#3A2A22]", children: t.name }), _jsxs("p", { className: "flex items-center gap-1.5 text-xs text-[#B7A79D]", children: [t.trainerId, batch && course && (_jsxs(_Fragment, { children: [_jsxs("span", { children: ["\u00B7 ", batch.code] }), _jsx(Badge, { tone: batch.mode === "online" ? "blue" : "amber", className: "scale-75 origin-left px-1.5 py-0", children: batch.mode })] }))] })] }), _jsx(Badge, { tone: "red", children: "at risk" })] }, t.id));
                                            }), _jsx(Link, { to: "/trainees", children: _jsx(Button, { variant: "subtle", size: "sm", className: "mt-1 w-full justify-center", children: "View all trainees" }) })] })] })] })] })] }));
}
