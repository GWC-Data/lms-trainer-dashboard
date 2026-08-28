import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import PageLoader from "../ui/PageLoader";

export default function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    scrollRef.current?.scrollTo({ top: 0 });
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FFF8F6]">
      <Sidebar isCollapsed={isSidebarCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        <main className="relative flex-1 overflow-hidden">
          <div ref={scrollRef} className="app-canvas-bg h-full overflow-y-auto px-6 py-6">
            <Outlet />
          </div>
          <AnimatePresence>
            {isLoading && <PageLoader />}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
