import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
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
        </main>
      </div>
    </div>
  );
}
