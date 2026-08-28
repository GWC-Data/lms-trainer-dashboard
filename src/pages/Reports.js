import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
import { MessageSquareText, TrendingUp, Users2, CalendarX2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RadialProgress } from "@/components/ui/ProgressBar";
import { Avatar } from "@/components/ui/Avatar";
import { courses, trainees, quizzes, submissions, batchesForCourse, traineesForBatch, attendanceForBatch, avgProgressForCourse, } from "@/data/mockData";
const STATUS_COLORS = {
    Present: "#DE896A",
    Absent: "#E76F51",
    Late: "#F0C39B",
};
const ALL_BATCHES = "all";
export default function Reports() {
    const [courseId, setCourseId] = useState(courses[0].id);
    const [batchSelection, setBatchSelection] = useState(ALL_BATCHES);
    const courseBatches = useMemo(() => batchesForCourse(courseId), [courseId]);
    const selectedBatch = batchSelection === ALL_BATCHES ? null : courseBatches.find((b) => b.id === batchSelection);
    // Switching courses resets the batch selection back to "all batches" —
    // a batch id from the old course wouldn't mean anything for the new one.
    useEffect(() => {
        setBatchSelection(ALL_BATCHES);
    }, [courseId]);
    const scopeTrainees = useMemo(() => (selectedBatch ? traineesForBatch(selectedBatch.id) : trainees.filter((t) => t.courseId === courseId)), [selectedBatch, courseId]);
    const courseQuizzes = useMemo(() => quizzes.filter((q) => q.courseId === courseId), [courseId]);
    const feedbackLog = useMemo(() => submissions.filter((s) => s.status === "reviewed" && s.feedback), []);
    const avgCompletion = Math.round(scopeTrainees.reduce((sum, t) => sum + t.lessonCompletion, 0) / (scopeTrainees.length || 1));
    const completionRate = selectedBatch ? selectedBatch.progress : avgProgressForCourse(courseId);
    const completionLabel = selectedBatch
        ? `Batch ${selectedBatch.code}`
        : `Average across ${courseBatches.length} batch${courseBatches.length === 1 ? "" : "es"}`;
    const completionBuckets = [
        { range: "0-25%", count: scopeTrainees.filter((t) => t.lessonCompletion < 25).length },
        { range: "25-50%", count: scopeTrainees.filter((t) => t.lessonCompletion >= 25 && t.lessonCompletion < 50).length },
        { range: "50-75%", count: scopeTrainees.filter((t) => t.lessonCompletion >= 50 && t.lessonCompletion < 75).length },
        { range: "75-100%", count: scopeTrainees.filter((t) => t.lessonCompletion >= 75).length },
    ];
    // Attendance only exists for offline batches — never fabricate a number
    // for a self-paced online batch that never took attendance. Mode lives on
    // the batch, so a mixed course only counts its offline batches here.
    const offlineBatchesInScope = selectedBatch
        ? selectedBatch.mode === "offline"
            ? [selectedBatch]
            : []
        : courseBatches.filter((b) => b.mode === "offline");
    const attendanceRows = offlineBatchesInScope.flatMap((b) => attendanceForBatch(b.id));
    const attendanceData = [
        { name: "Present", value: attendanceRows.filter((r) => r.status === "P").length },
        { name: "Absent", value: attendanceRows.filter((r) => r.status === "A").length },
        { name: "Late", value: attendanceRows.filter((r) => r.status === "L").length },
    ];
    const hasAttendance = attendanceRows.length > 0;
    const quizScoreData = courseQuizzes.map((q) => ({ name: q.title.split(" ").slice(0, 2).join(" "), score: q.avgScore }));
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-[#3A2A22]", children: "Course Reports" }), _jsx("p", { className: "text-sm text-[#8C7A70]", children: "Trainee progress, attendance, scores, completion, and feedback history \u2014 batch by batch." })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("select", { value: courseId, onChange: (e) => setCourseId(e.target.value), className: "h-10 rounded-xl border border-[#F0DED4] bg-white px-3 text-sm text-[#3A2A22] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20", children: courses.map((c) => (_jsxs("option", { value: c.id, children: [c.name, " \u2014 ", c.level] }, c.id))) }), _jsxs("select", { value: batchSelection, onChange: (e) => setBatchSelection(e.target.value), className: "h-10 rounded-xl border border-[#F0DED4] bg-white px-3 text-sm text-[#3A2A22] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20", children: [_jsx("option", { value: ALL_BATCHES, children: "All batches" }), courseBatches.map((b) => (_jsxs("option", { value: b.id, children: [b.code, " \u2014 ", b.label] }, b.id)))] })] })] }), _jsxs("div", { className: "grid grid-cols-1 gap-5 lg:grid-cols-3", children: [_jsxs(Card, { className: "lg:col-span-2", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Trainee Progress" }), _jsxs("p", { className: "mt-1 text-xs text-[#B7A79D]", children: ["Lesson completion distribution across ", scopeTrainees.length, " trainees", selectedBatch ? ` in ${selectedBatch.code}` : ""] })] }), _jsxs(Badge, { tone: "orange", children: [_jsx(TrendingUp, { className: "h-3 w-3" }), " ", avgCompletion, "% avg"] })] }), _jsx(CardContent, { className: "h-56", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: completionBuckets, barSize: 40, children: [_jsx(CartesianGrid, { vertical: false, stroke: "#F5E2DA" }), _jsx(XAxis, { dataKey: "range", tick: { fontSize: 12, fill: "#8C7A70" }, axisLine: false, tickLine: false }), _jsx(YAxis, { tick: { fontSize: 12, fill: "#8C7A70" }, axisLine: false, tickLine: false, allowDecimals: false }), _jsx(Tooltip, { cursor: { fill: "#FBECE7" }, contentStyle: { borderRadius: 12, borderColor: "#F0DED4" } }), _jsx(Bar, { dataKey: "count", fill: "#DE896A", radius: [8, 8, 0, 0] })] }) }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Completion Rate" }) }), _jsxs(CardContent, { className: "flex flex-col items-center justify-center gap-3 pb-6", children: [_jsx("div", { className: "rounded-full bg-gradient-to-br from-[#E38F6C] to-[#C26D4D] p-3", children: _jsx(RadialProgress, { value: completionRate, size: 120, strokeWidth: 10, label: `${completionRate}%`, sublabel: "complete" }) }), _jsx("p", { className: "text-xs text-[#8C7A70]", children: completionLabel })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Attendance Summary" }), selectedBatch && _jsxs("p", { className: "mt-1 text-xs text-[#B7A79D]", children: ["Batch ", selectedBatch.code] })] }), _jsx(CardContent, { children: hasAttendance ? (_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "h-40 w-40 shrink-0", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(PieChart, { children: [_jsx(Pie, { data: attendanceData, dataKey: "value", nameKey: "name", innerRadius: 45, outerRadius: 70, paddingAngle: 3, children: attendanceData.map((entry) => (_jsx(Cell, { fill: STATUS_COLORS[entry.name] }, entry.name))) }), _jsx(Tooltip, { contentStyle: { borderRadius: 12, borderColor: "#F0DED4" } })] }) }) }), _jsx("div", { className: "space-y-2", children: attendanceData.map((d) => (_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("span", { className: "h-2.5 w-2.5 rounded-full", style: { backgroundColor: STATUS_COLORS[d.name] } }), _jsx("span", { className: "text-[#6B5A52]", children: d.name }), _jsx("span", { className: "font-semibold text-[#3A2A22]", children: d.value })] }, d.name))) })] })) : (_jsxs("div", { className: "flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-[#B7A79D]", children: [_jsx(CalendarX2, { className: "h-7 w-7 text-[#E9D6CC]" }), "Attendance isn't tracked for self-paced online batches."] })) })] }), _jsxs(Card, { className: "lg:col-span-2", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Assessment Scores" }), _jsx("p", { className: "mt-1 text-xs text-[#B7A79D]", children: "Average quiz score per assessment (shared across every batch)" })] }), _jsx(CardContent, { className: "h-56", children: quizScoreData.length === 0 ? (_jsx("p", { className: "flex h-full items-center justify-center text-sm text-[#B7A79D]", children: "No quizzes for this course yet." })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: quizScoreData, layout: "vertical", barSize: 20, children: [_jsx(CartesianGrid, { horizontal: false, stroke: "#F5E2DA" }), _jsx(XAxis, { type: "number", domain: [0, 100], tick: { fontSize: 12, fill: "#8C7A70" }, axisLine: false, tickLine: false }), _jsx(YAxis, { type: "category", dataKey: "name", tick: { fontSize: 12, fill: "#8C7A70" }, axisLine: false, tickLine: false, width: 110 }), _jsx(Tooltip, { cursor: { fill: "#FBECE7" }, contentStyle: { borderRadius: 12, borderColor: "#F0DED4" } }), _jsx(Bar, { dataKey: "score", fill: "#DE896A", radius: [0, 8, 8, 0] })] }) })) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { className: "flex flex-row items-center gap-2", children: [_jsx(MessageSquareText, { className: "h-4 w-4 text-[#DE896A]" }), _jsx(CardTitle, { children: "Feedback Log" })] }), _jsx(CardContent, { className: "max-h-56 space-y-3 overflow-y-auto", children: feedbackLog.length === 0 ? (_jsxs("p", { className: "flex items-center gap-2 text-sm text-[#B7A79D]", children: [_jsx(Users2, { className: "h-4 w-4" }), " No feedback published yet."] })) : (feedbackLog.map((s) => (_jsxs("div", { className: "flex gap-2.5 rounded-xl bg-[#FFFBF9] p-3", children: [_jsx(Avatar, { initials: s.traineeInitials, className: "h-8 w-8" }), _jsxs("div", { className: "min-w-0", children: [_jsxs("p", { className: "text-xs font-semibold text-[#3A2A22]", children: [s.traineeName, " ", _jsxs("span", { className: "font-normal text-[#B7A79D]", children: ["\u00B7 ", s.marks, "%"] })] }), _jsx("p", { className: "mt-0.5 text-xs text-[#8C7A70]", children: s.feedback })] })] }, s.id)))) })] })] })] }));
}
