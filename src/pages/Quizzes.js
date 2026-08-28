import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Plus, ClipboardList, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { courseById } from "@/data/mockData";
import { useContent } from "@/context/ContentContext";
import QuizFormModal from "@/components/forms/QuizFormModal";
import QuizResultsModal from "@/components/forms/QuizResultsModal";
export default function Quizzes() {
    const { quizzes } = useContent();
    const [formOpen, setFormOpen] = useState(false);
    const [editingQuiz, setEditingQuiz] = useState(null);
    const [resultsQuiz, setResultsQuiz] = useState(null);
    function openCreate() {
        setEditingQuiz(null);
        setFormOpen(true);
    }
    function openEdit(quiz) {
        setEditingQuiz(quiz);
        setFormOpen(true);
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-[#3A2A22]", children: "Quizzes" }), _jsxs("p", { className: "flex items-center gap-1.5 text-sm text-[#8C7A70]", children: [_jsx(Zap, { className: "h-3.5 w-3.5 text-[#DE896A]" }), " Auto-evaluated by the system the moment a trainee submits."] })] }), _jsxs(Button, { onClick: openCreate, children: [_jsx(Plus, { className: "h-4 w-4" }), " Create Quiz"] })] }), quizzes.length === 0 && _jsx("p", { className: "text-sm text-[#B7A79D]", children: "No quizzes yet \u2014 create one to get started." }), _jsx("div", { className: "grid grid-cols-1 gap-5 lg:grid-cols-2", children: quizzes.map((q) => {
                    const course = courseById(q.courseId);
                    const submissionRate = q.totalTrainees > 0 ? Math.round((q.submissions / q.totalTrainees) * 100) : 0;
                    return (_jsx(Card, { children: _jsxs(CardContent, { className: "p-5", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [_jsx("div", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A]", children: _jsx(ClipboardList, { className: "h-5 w-5" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate font-semibold text-[#3A2A22]", children: q.title }), _jsxs("p", { className: "truncate text-xs text-[#B7A79D]", children: [course?.name, " \u00B7 ", q.questions, " questions"] })] })] }), _jsx(Badge, { tone: q.status === "published" ? "green" : "neutral", children: q.status })] }), _jsxs("div", { className: "mt-4 grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "rounded-lg bg-[#FFFBF9] p-3", children: [_jsx("p", { className: "text-[10px] uppercase tracking-wide text-[#B7A79D]", children: "Submissions" }), _jsxs("p", { className: "mt-1 text-sm font-semibold text-[#3A2A22]", children: [q.submissions, "/", q.totalTrainees] }), _jsx(ProgressBar, { value: submissionRate, className: "mt-2" })] }), _jsxs("div", { className: "rounded-lg bg-[#FFFBF9] p-3", children: [_jsx("p", { className: "text-[10px] uppercase tracking-wide text-[#B7A79D]", children: "Average Score" }), _jsx("p", { className: "mt-1 text-sm font-semibold text-[#3A2A22]", children: q.status === "published" ? `${q.avgScore}%` : "—" }), _jsx(ProgressBar, { value: q.avgScore, className: "mt-2" })] })] }), _jsxs("div", { className: "mt-4 flex gap-2", children: [_jsx(Button, { size: "sm", variant: "outline", className: "flex-1 justify-center", onClick: () => openEdit(q), children: "Edit" }), _jsx(Button, { size: "sm", className: "flex-1 justify-center", onClick: () => setResultsQuiz(q), children: "View Results" })] })] }) }, q.id));
                }) }), _jsx(QuizFormModal, { open: formOpen, onOpenChange: setFormOpen, quiz: editingQuiz }), _jsx(QuizResultsModal, { open: Boolean(resultsQuiz), onOpenChange: (open) => !open && setResultsQuiz(null), quiz: resultsQuiz })] }));
}
