import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Home,
  ChevronRight,
  Menu,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/Badge";
import { Avatar, getInitials } from "@/components/ui/Avatar";
import { useTrainerDashboard } from "@/context/TrainerDashboardContext";
import { DashboardTraineeSupport } from "@/services/api";

const LABELS: Record<string, string> = {
  "": "Dashboard",
  courses: "Courses",
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
  const navigate = useNavigate();
  const { traineesNeedingSupport, atRiskCount, loading } = useTrainerDashboard();

  const segments = location.pathname.split("/").filter(Boolean);
  const crumbs = segments.length === 0 ? ["Dashboard"] : segments.map((s) => LABELS[s] ?? s);

  const handleTraineeClick = (trainee: DashboardTraineeSupport) => {
    navigate("/trainees", {
      state: {
        traineeId: trainee.id,
        search: trainee.name,
        batchId: trainee.batchId,
        riskOnly: true,
      },
    });
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#F5E2DA] bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-1.5 text-xs sm:text-sm text-[#8C7A70]">
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            className="mr-2 sm:mr-3 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl text-[#B7A79D] hover:bg-[#FBECE7] hover:text-[#DE896A] transition-colors"
            aria-label="Toggle Navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <Link to="/" className="flex items-center text-[#B7A79D] hover:text-[#DE896A] shrink-0">
          <Home className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-1.5 truncate">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5 truncate">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#D8C7BE]" />
              <span className={i === crumbs.length - 1 ? "font-medium text-[#3A2A22] truncate" : "truncate"}>
                {crumb}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Notification Bell with Real At-Risk Count and Dropdown Panel */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[#8C7A70] hover:bg-[#FBECE7] hover:text-[#DE896A] transition-colors focus:outline-none"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {!loading && atRiskCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                  {atRiskCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-[calc(100vw-2rem)] max-w-[380px] sm:w-[380px] p-0 rounded-2xl border-[#F0DED4] bg-white shadow-xl shadow-black/10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#F5E2DA] bg-[#FFF8F6]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#3A2A22]">
                    Trainees Needing Support
                  </h4>
                  <p className="text-[11px] text-[#8C7A70] truncate">
                    {atRiskCount > 0
                      ? `${atRiskCount} trainee${atRiskCount === 1 ? "" : "s"} currently flagged at risk`
                      : "No trainees currently at risk"}
                  </p>
                </div>
              </div>
              {atRiskCount > 0 && (
                <Badge tone="red" className="text-[10px] px-2 py-0.5 font-bold shrink-0">
                  {atRiskCount}
                </Badge>
              )}
            </div>

            {/* Trainee List */}
            <div className="max-h-[340px] overflow-y-auto divide-y divide-[#F8EFEA]">
              {atRiskCount === 0 ? (
                <div className="py-8 px-4 text-center">
                  <p className="text-xs font-medium text-[#8C7A70]">No trainees currently flagged at risk.</p>
                  <p className="text-[11px] text-[#B7A79D] mt-1">All active trainees are performing well!</p>
                </div>
              ) : (
                traineesNeedingSupport.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTraineeClick(t)}
                    className="w-full text-left p-3.5 hover:bg-[#FFF8F6] transition-colors flex items-start gap-3 group focus:bg-[#FFF8F6] focus:outline-none"
                  >
                    <Avatar
                      initials={getInitials(t.name)}
                      className="h-8 w-8 text-[11px] shrink-0 font-semibold mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-[#3A2A22] truncate group-hover:text-[#DE896A] transition-colors">
                          {t.name}
                        </p>
                        <Badge tone="red" className="text-[9px] px-1.5 py-0 h-4 shrink-0 font-bold">
                          AT RISK
                        </Badge>
                      </div>
                      {t.courseName && (
                        <p className="text-[11px] text-[#6B5A52] truncate mt-0.5" title={t.courseName}>
                          {t.courseName}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-[#8C7A70]">
                        {t.batchName && <span className="font-medium text-[#7C695E]">{t.batchName}</span>}
                        {t.batchName && (t.batchMode || t.reason) && (
                          <span className="text-[#D8C7BE]">·</span>
                        )}
                        {t.batchMode && (
                          <Badge
                            tone={t.batchMode.toLowerCase() === "online" ? "blue" : "amber"}
                            className="text-[9px] px-1.5 py-0 h-3.5"
                          >
                            {t.batchMode}
                          </Badge>
                        )}
                        {t.reason && (
                          <span className="text-[10px] text-[#A65B42] italic truncate">
                            {t.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 border-t border-[#F5E2DA] bg-[#FFFBF9]">
              <Link
                to="/trainees"
                className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold text-[#DE896A] hover:text-[#C26D4D] rounded-xl hover:bg-[#FBECE7] transition-colors"
              >
                View all in Trainees list <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
