import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { TrainerDashboardProvider } from "@/context/TrainerDashboardContext";

export default function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setIsMobileDrawerOpen(false);
  }, [location.pathname]);

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMobileDrawerOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <TrainerDashboardProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[#FFF8F6]">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileDrawerOpen}
          onCloseMobile={() => setIsMobileDrawerOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar toggleSidebar={handleToggleSidebar} />
          <main className="relative flex-1 overflow-hidden">
            <div
              ref={scrollRef}
              className="app-canvas-bg h-full overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-6"
            >
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TrainerDashboardProvider>
  );
}
