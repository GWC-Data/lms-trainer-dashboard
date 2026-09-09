import { useLocation, Link } from "react-router-dom";
import {
  HelpCircle,
  Bell,
  Home,
  ChevronRight,
  Menu,
} from "lucide-react";

const LABELS: Record<string, string> = {
  "": "Dashboard",
  courses: "My Courses",
  content: "Content",
  modules: "Modules",
  lessons: "Lessons",
  videos: "Videos",
  documents: "Materials",
  quizzes: "Quizzes",
  assignments: "Assignments",
  attendance: "Attendance",
  trainees: "Trainees",
  reports: "Reports",
};

interface TopbarProps {
  toggleSidebar?: () => void;
}

export default function Topbar({ toggleSidebar }: TopbarProps) {
  const location = useLocation();

  const segments = location.pathname.split("/").filter(Boolean);
  const crumbs = segments.length === 0 ? ["Dashboard"] : segments.map((s) => LABELS[s] ?? s);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#F5E2DA] bg-white px-6">
      <div className="flex items-center gap-1.5 text-sm text-[#8C7A70]">
        {toggleSidebar && (
          <button onClick={toggleSidebar} className="mr-3 flex items-center text-[#B7A79D] hover:text-[#DE896A]">
            <Menu className="h-5 w-5" />
          </button>
        )}
        <Link to="/" className="flex items-center text-[#B7A79D] hover:text-[#DE896A]">
          <Home className="h-4 w-4" />
        </Link>
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-[#D8C7BE]" />
            <span className={i === crumbs.length - 1 ? "font-medium text-[#3A2A22]" : ""}>{crumb}</span>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8C7A70] hover:bg-[#FBECE7] hover:text-[#DE896A]">
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[#8C7A70] hover:bg-[#FBECE7] hover:text-[#DE896A]">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#DE896A]" />
        </button>
      </div>
    </header>
  );
}
