import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import PageLoader from "../ui/PageLoader";
export default function DashboardLayout() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const location = useLocation();
    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, [location.pathname]);
    return (_jsxs("div", { className: "flex h-screen w-full overflow-hidden bg-[#FFF8F6]", children: [_jsx(Sidebar, { isCollapsed: isSidebarCollapsed }), _jsxs("div", { className: "flex min-w-0 flex-1 flex-col", children: [_jsx(Topbar, { toggleSidebar: () => setIsSidebarCollapsed(!isSidebarCollapsed) }), _jsxs("main", { className: "relative flex-1 overflow-y-auto px-6 py-6", children: [_jsx(Outlet, {}), _jsx(AnimatePresence, { children: isLoading && _jsx(PageLoader, {}) })] })] })] }));
}
