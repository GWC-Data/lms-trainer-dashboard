import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { courseById } from "@/data/mockData";
export default function QuizResultsModal({ open, onOpenChange, quiz }) {
    if (!quiz)
        return null;
    const course = courseById(quiz.courseId);
    const submissionRate = quiz.totalTrainees > 0 ? Math.round((quiz.submissions / quiz.totalTrainees) * 100) : 0;
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: quiz.title }), _jsxs(DialogDescription, { children: [course?.name, " \u00B7 ", quiz.questions, " questions"] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-[#6B5A52]", children: "Status" }), _jsx(Badge, { tone: quiz.status === "published" ? "green" : "neutral", children: quiz.status })] }), _jsxs("div", { className: "rounded-lg bg-[#FFFBF9] p-3", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-[#8C7A70]", children: [_jsx("span", { className: "uppercase tracking-wide", children: "Submissions" }), _jsxs("span", { className: "font-semibold text-[#3A2A22]", children: [quiz.submissions, "/", quiz.totalTrainees] })] }), _jsx(ProgressBar, { value: submissionRate, className: "mt-2" })] }), _jsxs("div", { className: "rounded-lg bg-[#FFFBF9] p-3", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-[#8C7A70]", children: [_jsx("span", { className: "uppercase tracking-wide", children: "Average score" }), _jsx("span", { className: "font-semibold text-[#3A2A22]", children: quiz.status === "published" ? `${quiz.avgScore}%` : "—" })] }), _jsx(ProgressBar, { value: quiz.avgScore, className: "mt-2" })] }), quiz.submissions === 0 && (_jsx("p", { className: "text-center text-sm text-[#B7A79D]", children: "No trainees have submitted this quiz yet." }))] })] }) }));
}
