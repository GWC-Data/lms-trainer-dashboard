import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutGrid, BookOpen, Boxes, FileText, Video, File, ClipboardList, PencilLine, UserCheck, Users, BarChart3, LogOut, } from "lucide-react";
import { cn } from "@/lib/utils";
import { trainer } from "@/data/mockData";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import logo from "@/assets/logo.png";
import favicon from "@/assets/favicon.png";
const sections = [
    {
        items: [
            { to: "/", label: "Dashboard", icon: LayoutGrid },
            { to: "/courses", label: "My Courses", icon: BookOpen },
        ],
    },
    {
        label: "Content Management",
        items: [
            { to: "/content/modules", label: "Modules", icon: Boxes },
            { to: "/content/lessons", label: "Lessons", icon: FileText },
            { to: "/content/videos", label: "Videos", icon: Video },
            { to: "/content/documents", label: "Documents", icon: File },
        ],
    },
    {
        label: "Assessment",
        items: [
            { to: "/quizzes", label: "Quizzes", icon: ClipboardList },
            { to: "/assignments", label: "Assignments", icon: PencilLine },
        ],
    },
    {
        label: "Operations",
        items: [
            { to: "/attendance", label: "Attendance", icon: UserCheck },
            { to: "/trainees", label: "Trainees", icon: Users },
            { to: "/reports", label: "Reports", icon: BarChart3 },
        ],
    },
];
export default function Sidebar({ isCollapsed = false }) {
    const { logout } = useAuth();
    const navigate = useNavigate();
    function handleLogout() {
        logout();
        navigate("/login", { replace: true });
    }
    return (_jsxs("aside", { className: cn("flex h-full shrink-0 flex-col border-r border-[#F5E2DA] bg-white transition-all duration-300", isCollapsed ? "w-20" : "w-56"), children: [_jsx("div", { className: cn("flex h-16 shrink-0 items-center", isCollapsed ? "justify-center px-0" : "px-5"), children: isCollapsed ? (_jsx("img", { src: favicon, alt: "TeqCertify", className: "h-8 w-8 object-contain" })) : (_jsx("img", { src: logo, alt: "TeqCertify", className: "h-7 w-auto object-contain" })) }), _jsx("nav", { className: "flex-1 pl-3 pr-1.5 pb-4 pt-4", children: sections.map((section, idx) => (_jsxs("div", { className: cn(idx > 0 && (isCollapsed ? "mt-2" : "mt-4")), children: [section.label && !isCollapsed && (_jsx("p", { className: "px-4 pb-2 text-[9px] font-bold uppercase tracking-wider text-[#B7A79D]", children: section.label })), _jsx("ul", { className: "space-y-0.5", children: section.items.map((item) => (_jsx("li", { children: _jsxs(NavLink, { to: item.to, end: item.to === "/", className: ({ isActive }) => cn("flex items-center rounded-xl transition-colors", isCollapsed ? "justify-center p-2" : "gap-3 px-4 py-2.5", isActive
                                        ? "bg-[#DE896A] text-white shadow-sm shadow-[#DE896A]/30"
                                        : "text-[#6B5A52] hover:bg-[#FBECE7] hover:text-[#8A442E]"), title: isCollapsed ? item.label : undefined, children: [_jsx(item.icon, { className: "h-5 w-5 shrink-0" }), !isCollapsed && _jsx("span", { className: "text-[13px] font-medium", children: item.label })] }) }, item.to))) })] }, idx))) }), _jsxs("div", { className: cn("flex border-t border-[#F5E2DA] py-4", isCollapsed ? "flex-col items-center gap-4 px-2" : "items-center gap-3 px-4"), children: [_jsx(Avatar, { initials: trainer.initials }), !isCollapsed && (_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm font-semibold text-[#3A2A22]", children: trainer.name }), _jsx("p", { className: "truncate text-xs text-[#B7A79D]", children: trainer.role })] })), _jsx("button", { onClick: handleLogout, title: "Log out", "aria-label": "Log out", className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#B7A79D] hover:bg-[#FBECE7] hover:text-[#DE896A]", children: _jsx(LogOut, { className: "h-4 w-4" }) })] })] }));
}
