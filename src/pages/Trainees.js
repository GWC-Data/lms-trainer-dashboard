import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search, AlertTriangle, Users, ChevronDown, CheckCircle2, CircleDot, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar, avatarUrlFor } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { trainees, courses, courseById, batchById, batchesForCourse, traineeModuleProgress } from "@/data/mockData";
import { cn } from "@/lib/utils";
const STATUS_META = {
    completed: { icon: CheckCircle2, className: "text-emerald-600", label: "Completed" },
    "in-progress": { icon: CircleDot, className: "text-[#DE896A]", label: "In progress" },
    "not-started": { icon: Circle, className: "text-[#D8C7BE]", label: "Not started" },
};
const ALL = "all";
export default function Trainees() {
    const location = useLocation();
    const requestedBatchId = location.state?.batchId;
    const requestedBatch = requestedBatchId ? batchById(requestedBatchId) : undefined;
    const [query, setQuery] = useState("");
    const [courseFilter, setCourseFilter] = useState(requestedBatch?.courseId ?? ALL);
    const [batchFilter, setBatchFilter] = useState(requestedBatchId ?? ALL);
    const [riskOnly, setRiskOnly] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    // Deep-linking in from My Courses ("View Progress" on a specific batch)
    // should jump straight to that course + batch even if this page was
    // already mounted.
    useEffect(() => {
        if (requestedBatchId && requestedBatch) {
            setCourseFilter(requestedBatch.courseId);
            setBatchFilter(requestedBatchId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestedBatchId]);
    const batchOptions = useMemo(() => (courseFilter === ALL ? [] : batchesForCourse(courseFilter)), [courseFilter]);
    function handleCourseChange(value) {
        setCourseFilter(value);
        setBatchFilter(ALL); // a batch id from the old course wouldn't apply here
    }
    const filtered = useMemo(() => trainees.filter((t) => {
        if (courseFilter !== ALL && t.courseId !== courseFilter)
            return false;
        if (batchFilter !== ALL && t.batchId !== batchFilter)
            return false;
        if (riskOnly && !t.atRisk)
            return false;
        if (query.trim() && !t.name.toLowerCase().includes(query.toLowerCase()) && !t.trainerId.toLowerCase().includes(query.toLowerCase()))
            return false;
        return true;
    }), [query, courseFilter, batchFilter, riskOnly]);
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-[#3A2A22]", children: "Trainees" }), _jsx("p", { className: "text-sm text-[#8C7A70]", children: "Lesson completion, quiz scores, and attendance at a glance \u2014 every batch tracked on its own, expand a trainee to see every module handled in their batch." })] }), _jsxs("div", { className: "flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-[#8C7A70] shadow-sm shadow-[#DE896A]/5 border border-[#F5E2DA]", children: [_jsx(Users, { className: "h-4 w-4 text-[#DE896A]" }), " ", trainees.length, " total"] })] }), _jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" }), _jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search by name or ID...", className: "h-10 w-full rounded-xl border border-[#F0DED4] bg-white pl-9 pr-3 text-sm text-[#3A2A22] placeholder:text-[#C7B6AC] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20" })] }), _jsxs("select", { value: courseFilter, onChange: (e) => handleCourseChange(e.target.value), className: "h-10 rounded-xl border border-[#F0DED4] bg-white px-3 text-sm text-[#3A2A22] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20", children: [_jsx("option", { value: ALL, children: "All Courses" }), courses.map((c) => (_jsxs("option", { value: c.id, children: [c.name, " \u2014 ", c.level] }, c.id)))] }), _jsxs("select", { value: batchFilter, onChange: (e) => setBatchFilter(e.target.value), disabled: courseFilter === ALL, className: "h-10 rounded-xl border border-[#F0DED4] bg-white px-3 text-sm text-[#3A2A22] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20 disabled:cursor-not-allowed disabled:opacity-50", children: [_jsx("option", { value: ALL, children: "All batches" }), batchOptions.map((b) => (_jsxs("option", { value: b.id, children: [b.code, " \u2014 ", b.label] }, b.id)))] }), _jsxs("button", { onClick: () => setRiskOnly((v) => !v), className: cn("flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors", riskOnly ? "border-red-200 bg-red-50 text-red-600" : "border-[#F0DED4] bg-white text-[#8C7A70] hover:bg-[#FBECE7]"), children: [_jsx(AlertTriangle, { className: "h-4 w-4" }), " At-risk only"] })] }), _jsxs(Card, { children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-[10px] font-bold uppercase tracking-wide text-[#B7A79D]", children: [_jsx("th", { className: "px-5 py-3", children: "Trainee" }), _jsx("th", { className: "px-5 py-3", children: "Batch / Course" }), _jsx("th", { className: "px-5 py-3", children: "Lesson Completion" }), _jsx("th", { className: "px-5 py-3", children: "Quiz Score" }), _jsx("th", { className: "px-5 py-3", children: "Attendance" }), _jsx("th", { className: "px-5 py-3", children: "Status" })] }) }), _jsx("tbody", { className: "divide-y divide-[#F5E2DA]", children: filtered.map((t) => {
                                        const course = courseById(t.courseId);
                                        const batch = batchById(t.batchId);
                                        const isExpanded = expandedId === t.id;
                                        const moduleProgress = isExpanded ? traineeModuleProgress(t) : [];
                                        const completedCount = moduleProgress.filter((mp) => mp.status === "completed").length;
                                        return (_jsxs(Fragment, { children: [_jsxs("tr", { onClick: () => setExpandedId(isExpanded ? null : t.id), className: cn("cursor-pointer hover:bg-[#FFFBF9]", isExpanded && "bg-[#FFFBF9]"), children: [_jsx("td", { className: "px-5 py-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(ChevronDown, { className: cn("h-4 w-4 shrink-0 text-[#C7B6AC] transition-transform duration-200", isExpanded && "rotate-180 text-[#DE896A]") }), _jsx(Avatar, { initials: t.initials, src: avatarUrlFor(t.id) }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-[#3A2A22]", children: t.name }), _jsxs("p", { className: "text-xs text-[#B7A79D]", children: ["ID: ", t.trainerId] })] })] }) }), _jsxs("td", { className: "px-5 py-3 text-[#6B5A52]", children: [course?.name, batch && course && (_jsxs("span", { className: "ml-1.5 inline-flex items-center gap-1.5 text-xs text-[#B7A79D]", children: ["\u00B7 ", batch.code, _jsx(Badge, { tone: course.mode === "online" ? "blue" : "amber", className: "scale-75 origin-left px-1.5 py-0", children: course.mode })] }))] }), _jsx("td", { className: "px-5 py-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(ProgressBar, { value: t.lessonCompletion, className: "w-24" }), _jsxs("span", { className: "text-xs text-[#8C7A70]", children: [t.lessonCompletion, "%"] })] }) }), _jsx("td", { className: "px-5 py-3", children: _jsxs("span", { className: cn("text-sm font-medium", t.quizScore < 60 ? "text-red-500" : "text-[#3A2A22]"), children: [t.quizScore, "%"] }) }), _jsx("td", { className: "px-5 py-3", children: _jsxs("span", { className: cn("text-sm font-medium", t.attendance < 75 ? "text-red-500" : "text-[#3A2A22]"), children: [t.attendance, "%"] }) }), _jsx("td", { className: "px-5 py-3", children: t.atRisk ? (_jsxs(Badge, { tone: "red", children: [_jsx(AlertTriangle, { className: "h-3 w-3" }), " at risk"] })) : (_jsx(Badge, { tone: "green", children: "on track" })) })] }), isExpanded && (_jsx("tr", { className: "bg-[#FFFBF9]", children: _jsx("td", { colSpan: 6, className: "px-5 pb-5 pt-0", children: _jsxs("div", { className: "rounded-xl border border-[#F0DED4] bg-white p-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsxs("p", { className: "text-xs font-semibold uppercase tracking-wide text-[#B7A79D]", children: ["Every module in this batch \u2014 ", course?.name, " (", batch?.code ?? "self-paced", ")"] }), _jsxs("span", { className: "text-xs font-medium text-[#8C7A70]", children: [completedCount, "/", moduleProgress.length, " modules completed"] })] }), _jsx("div", { className: "mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3", children: moduleProgress.map(({ module, status }) => {
                                                                        const meta = STATUS_META[status];
                                                                        return (_jsxs("div", { className: "flex items-center gap-2 rounded-lg bg-[#FFFBF9] px-3 py-2", children: [_jsx(meta.icon, { className: cn("h-4 w-4 shrink-0", meta.className) }), _jsx("span", { className: "min-w-0 flex-1 truncate text-xs font-medium text-[#3A2A22]", children: module.title }), _jsx("span", { className: cn("shrink-0 text-[10px] font-semibold", meta.className), children: meta.label })] }, module.id));
                                                                    }) })] }) }) }))] }, t.id));
                                    }) })] }) }), filtered.length === 0 && (_jsx(CardContent, { className: "py-10 text-center text-sm text-[#B7A79D]", children: "No trainees match these filters." }))] })] }));
}
