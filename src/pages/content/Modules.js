import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Boxes, ChevronRight, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { courseById, courseModes } from "@/data/mockData";
import { useContent } from "@/context/ContentContext";
import AddModuleModal from "@/components/forms/AddModuleModal";
export default function Modules() {
    const { modules } = useContent();
    const [searchParams, setSearchParams] = useSearchParams();
    const [modalOpen, setModalOpen] = useState(false);
    const filterCourseId = searchParams.get("courseId") ?? undefined;
    const filterCourse = filterCourseId ? courseById(filterCourseId) : undefined;
    const visibleModules = filterCourseId ? modules.filter((m) => m.courseId === filterCourseId) : modules;
    function clearFilter() {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete("courseId");
            return next;
        });
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-[#3A2A22]", children: "Modules" }), _jsx("p", { className: "text-sm text-[#8C7A70]", children: "A course contains modules, each module contains lessons." })] }), _jsxs(Button, { onClick: () => setModalOpen(true), children: [_jsx(Plus, { className: "h-4 w-4" }), " New Module"] })] }), filterCourse && (_jsxs("button", { onClick: clearFilter, className: "inline-flex items-center gap-1.5 rounded-full border border-[#EEAF9C] bg-[#FBECE7] px-3 py-1.5 text-xs font-medium text-[#8A442E] hover:bg-[#F5D1C4]", children: ["Filtered by: ", filterCourse.name, " ", _jsx(X, { className: "h-3.5 w-3.5" })] })), _jsx(Card, { children: _jsxs(CardContent, { className: "divide-y divide-[#F5E2DA] p-0", children: [visibleModules.length === 0 && (_jsx("p", { className: "p-5 text-sm text-[#B7A79D]", children: "No modules yet \u2014 add one to get started." })), visibleModules.map((m) => {
                            const course = courseById(m.courseId);
                            return (_jsxs("div", { className: "flex items-center justify-between gap-4 p-4 hover:bg-[#FFFBF9]", children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [_jsx("div", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A]", children: _jsx(Boxes, { className: "h-5 w-5" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate font-medium text-[#3A2A22]", children: m.title }), _jsxs("p", { className: "truncate text-xs text-[#B7A79D]", children: [course?.name, " \u00B7 ", m.lessonsCount, " lessons \u00B7 updated ", m.updatedAt] })] })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-3", children: [_jsx(Badge, { tone: "neutral", children: courseModes(m.courseId).join(" + ") }), _jsx(ChevronRight, { className: "h-4 w-4 text-[#C7B6AC]" })] })] }, m.id));
                        })] }) }), _jsx(AddModuleModal, { open: modalOpen, onOpenChange: setModalOpen, defaultCourseId: filterCourseId })] }));
}
