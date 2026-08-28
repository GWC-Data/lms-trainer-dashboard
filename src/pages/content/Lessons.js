import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Plus, Video, File, ClipboardList, PencilLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { courseById } from "@/data/mockData";
import { useContent } from "@/context/ContentContext";
import AddLessonModal from "@/components/forms/AddLessonModal";
const typeMeta = {
    video: { icon: Video, tone: "blue", label: "Video" },
    document: { icon: File, tone: "green", label: "Document" },
    quiz: { icon: ClipboardList, tone: "orange", label: "Quiz" },
    assignment: { icon: PencilLine, tone: "amber", label: "Assignment" },
};
export default function Lessons() {
    const { lessons, modules } = useContent();
    const [modalOpen, setModalOpen] = useState(false);
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-[#3A2A22]", children: "Lessons" }), _jsx("p", { className: "text-sm text-[#8C7A70]", children: "Each lesson can carry videos, documents, quizzes, or assignments." })] }), _jsxs(Button, { onClick: () => setModalOpen(true), children: [_jsx(Plus, { className: "h-4 w-4" }), " New Lesson"] })] }), _jsx(Card, { children: _jsxs(CardContent, { className: "divide-y divide-[#F5E2DA] p-0", children: [lessons.length === 0 && (_jsx("p", { className: "p-5 text-sm text-[#B7A79D]", children: "No lessons yet \u2014 add one to get started." })), lessons.map((l) => {
                            const meta = typeMeta[l.type];
                            const mod = modules.find((m) => m.id === l.moduleId);
                            const course = courseById(l.courseId);
                            return (_jsxs("div", { className: "flex items-center justify-between gap-4 p-4 hover:bg-[#FFFBF9]", children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [_jsx("div", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A]", children: _jsx(meta.icon, { className: "h-5 w-5" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate font-medium text-[#3A2A22]", children: l.title }), _jsxs("p", { className: "truncate text-xs text-[#B7A79D]", children: [course?.name, " \u00B7 ", mod?.title, l.duration ? ` · ${l.duration}` : ""] })] })] }), _jsx(Badge, { tone: meta.tone, children: meta.label })] }, l.id));
                        })] }) }), _jsx(AddLessonModal, { open: modalOpen, onOpenChange: setModalOpen })] }));
}
