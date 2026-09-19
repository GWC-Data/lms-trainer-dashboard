


import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  BookOpen,
  Boxes,
  // FileText, // Lessons temporarily disabled
  File,
  ClipboardList,
  PencilLine,
  UserCheck,
  Users,
  BarChart3,
  LogOut,
  Layers,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import logo from "@/assets/logo.png";
import favicon from "@/assets/favicon.png";

const TRAINER_PHOTO = "https://randomuser.me/api/portraits/men/51.jpg";

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
      { to: "/courses", label: "Courses", icon: BookOpen },
    ],
  },
  {
    label: "Content Management",
    items: [
      { to: "/content/modules", label: "Modules", icon: Boxes },
      // { to: "/content/lessons", label: "Lessons", icon: FileText }, // Temporarily disabled
      { to: "/content/documents", label: "Materials", icon: File },
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
      { to: "/batches", label: "Batches", icon: Layers },
      { to: "/calendar", label: "Calendar", icon: CalendarIcon },
      { to: "/attendance", label: "Attendance", icon: UserCheck },
      { to: "/trainees", label: "Trainees", icon: Users },
      { to: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
];

interface SidebarProps {
  isCollapsed?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  isCollapsed = false,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const trainerName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
    : "Trainer";

  const trainerRole = user?.role || "Trainer";

  const trainerInitials = user
    ? ((user.firstName?.[0] || "") + (user.lastName?.[0] || "")).toUpperCase() || "TR"
    : "TR";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "flex h-full shrink-0 flex-col border-r border-[#F5E2DA] bg-white transition-all duration-300 z-50",
          "fixed inset-y-0 left-0 md:static",
          isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "md:w-20" : "w-60 md:w-56"
        )}
      >
        <div className={cn("flex h-16 shrink-0 items-center justify-between", isCollapsed ? "md:justify-center px-4 md:px-0" : "px-5")}>
          <div className="flex items-center">
            {isCollapsed ? (
              <img src={favicon} alt="TeqCertify" className="h-8 w-8 object-contain" />
            ) : (
              <img src={logo} alt="TeqCertify" className="h-7 w-auto object-contain" />
            )}
          </div>
          {/* Close button on mobile drawer */}
          <button
            onClick={onCloseMobile}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#B7A79D] hover:bg-[#FBECE7] hover:text-[#DE896A] md:hidden"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-nav-scroll flex-1 overflow-y-auto overflow-x-hidden pl-3 pr-1.5 pb-4 pt-4">
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
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center rounded-xl transition-colors",
                          isCollapsed ? "md:justify-center p-2.5 md:p-2" : "gap-3 px-4 py-2.5",
                          isActive
                            ? "bg-[#DE896A] text-white shadow-sm shadow-[#DE896A]/30"
                            : "text-[#6B5A52] hover:bg-[#FBECE7] hover:text-[#8A442E]"
                        )
                      }
                      title={isCollapsed ? item.label : undefined}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {(!isCollapsed || isMobileOpen) && (
                        <span className="text-[13px] font-medium">{item.label}</span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

      <div className={cn("flex border-t border-[#F5E2DA] py-4 shrink-0", isCollapsed ? "flex-col items-center gap-4 px-2" : "items-center gap-3 px-4")}>
        <Avatar src={TRAINER_PHOTO} initials={trainerInitials} />
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#3A2A22]">{trainerName}</p>
            <p className="truncate text-xs text-[#B7A79D]">{trainerRole}</p>
          </div>
        )}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          title="Log out"
          aria-label="Log out"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#B7A79D] hover:bg-[#FBECE7] hover:text-[#DE896A] transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>

    {/* Logout Confirmation Dialog */}
    <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[420px] p-6 rounded-2xl border border-[#F5E2DA] bg-white shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FBECE7] text-[#DE896A]">
            <LogOut className="h-5 w-5" />
          </div>
          <div className="space-y-1 pr-6">
            <DialogTitle className="text-base font-bold text-[#3A2A22]">
              Are you sure you want to logout?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#8C7A70] leading-relaxed">
              You will be signed out of your TeqCertify account.
            </DialogDescription>
          </div>
        </div>

        <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowLogoutConfirm(false)}
            className="h-9 px-4 rounded-xl border-[#F0DED4] text-xs font-semibold text-[#6B5A52] hover:bg-[#FDF7F5] hover:text-[#3A2A22] cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setShowLogoutConfirm(false);
              handleLogout();
            }}
            className="h-9 px-4 rounded-xl bg-[#DE896A] text-xs font-semibold text-white shadow-sm shadow-[#DE896A]/30 hover:bg-[#D47A5A] active:bg-[#C26D4D] cursor-pointer"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Logout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}
