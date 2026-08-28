import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLocation, Link } from "react-router-dom";
import { Search, HelpCircle, Bell, Home, ChevronRight, Menu } from "lucide-react";
const LABELS = {
    "": "Dashboard",
    courses: "My Courses",
    content: "Content",
    modules: "Modules",
    lessons: "Lessons",
    videos: "Videos",
    documents: "Documents",
    quizzes: "Quizzes",
    assignments: "Assignments",
    attendance: "Attendance",
    trainees: "Trainees",
    reports: "Reports",
};
export default function Topbar({ toggleSidebar }) {
    const location = useLocation();
    const segments = location.pathname.split("/").filter(Boolean);
    const crumbs = segments.length === 0 ? ["Dashboard"] : segments.map((s) => LABELS[s] ?? s);
    return (_jsxs("header", { className: "flex h-16 shrink-0 items-center justify-between border-b border-[#F5E2DA] bg-white px-6", children: [_jsxs("div", { className: "flex items-center gap-1.5 text-sm text-[#8C7A70]", children: [toggleSidebar && (_jsx("button", { onClick: toggleSidebar, className: "mr-3 flex items-center text-[#B7A79D] hover:text-[#DE896A]", children: _jsx(Menu, { className: "h-5 w-5" }) })), _jsx(Link, { to: "/", className: "flex items-center text-[#B7A79D] hover:text-[#DE896A]", children: _jsx(Home, { className: "h-4 w-4" }) }), crumbs.map((crumb, i) => (_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(ChevronRight, { className: "h-3.5 w-3.5 text-[#D8C7BE]" }), _jsx("span", { className: i === crumbs.length - 1 ? "font-medium text-[#3A2A22]" : "", children: crumb })] }, i)))] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative hidden sm:block", children: [_jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" }), _jsx("input", { type: "text", placeholder: "Search training materials...", className: "h-9 w-64 rounded-xl border border-[#F0DED4] bg-[#FFFBF9] pl-9 pr-3 text-sm text-[#3A2A22] placeholder:text-[#C7B6AC] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20" })] }), _jsx("button", { className: "flex h-9 w-9 items-center justify-center rounded-xl text-[#8C7A70] hover:bg-[#FBECE7] hover:text-[#DE896A]", children: _jsx(HelpCircle, { className: "h-[18px] w-[18px]" }) }), _jsxs("button", { className: "relative flex h-9 w-9 items-center justify-center rounded-xl text-[#8C7A70] hover:bg-[#FBECE7] hover:text-[#DE896A]", children: [_jsx(Bell, { className: "h-[18px] w-[18px]" }), _jsx("span", { className: "absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#DE896A]" })] })] })] }));
}
