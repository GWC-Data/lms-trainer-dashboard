import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  BookOpen,
  Boxes,
  FileText,
  Video,
  File,
  ClipboardList,
  PencilLine,
  UserCheck,
  Users,
  BarChart3,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trainer } from "@/data/mockData";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import logo from "@/assets/logo.png";
import favicon from "@/assets/favicon.png";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const sections: NavSection[] = [
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

interface SidebarProps {
  isCollapsed?: boolean;
}

export default function Sidebar({ isCollapsed = false }: SidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className={cn("flex h-full shrink-0 flex-col border-r border-[#F5E2DA] bg-white transition-all duration-300", isCollapsed ? "w-20" : "w-56")}>
      <div className={cn("flex h-16 shrink-0 items-center", isCollapsed ? "justify-center px-0" : "px-5")}>
        {isCollapsed ? (
          <img src={favicon} alt="TeqCertify" className="h-8 w-8 object-contain" />
        ) : (
          <img src={logo} alt="TeqCertify" className="h-7 w-auto object-contain" />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto pl-3 pr-1.5 pb-4 pt-4">
        {sections.map((section, idx) => (
          <div key={idx} className={cn(idx > 0 && (isCollapsed ? "mt-2" : "mt-4"))}>
            {section.label && !isCollapsed && (
              <p className="px-4 pb-2 text-[9px] font-bold uppercase tracking-wider text-[#B7A79D]">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center rounded-xl transition-colors",
                        isCollapsed ? "justify-center p-2" : "gap-3 px-4 py-2.5",
                        isActive
                          ? "bg-[#DE896A] text-white shadow-sm shadow-[#DE896A]/30"
                          : "text-[#6B5A52] hover:bg-[#FBECE7] hover:text-[#8A442E]"
                      )
                    }
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span className="text-[13px] font-medium">{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("flex border-t border-[#F5E2DA] py-4", isCollapsed ? "flex-col items-center gap-4 px-2" : "items-center gap-3 px-4")}>
        <Avatar initials={trainer.initials} />
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#3A2A22]">{trainer.name}</p>
            <p className="truncate text-xs text-[#B7A79D]">{trainer.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          title="Log out"
          aria-label="Log out"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#B7A79D] hover:bg-[#FBECE7] hover:text-[#DE896A]"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
