import { Calendar, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";

interface DashboardHeaderProps {
  greeting: string;
  trainerFirstName: string;
  todayFormatted: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function DashboardHeader({
  greeting,
  trainerFirstName,
  todayFormatted,
  onRefresh,
  isRefreshing,
}: DashboardHeaderProps) {
  return (
    <div className="w-full min-w-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl sm:rounded-2xl border border-[#F0DED4] bg-white p-3 sm:p-4.5 shadow-xs">
      <div className="space-y-1 min-w-0">
        <h1 className="text-base sm:text-xl lg:text-2xl font-bold tracking-tight text-[#2E1F18] break-words leading-snug">
          {greeting}, {trainerFirstName} 👋
        </h1>
        <p className="text-xs text-[#8C7A70] leading-relaxed break-words">
          Overview of assigned curriculum, learning cohort performance, and scheduled sessions.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0 sm:self-center">
        <div className="flex items-center gap-1.5 rounded-xl border border-[#F0DED4] bg-[#FFFBF9] px-2.5 py-1.5 text-[11px] sm:text-xs font-medium text-[#7C695E] shadow-2xs">
          <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#DE896A]" />
          <span>{todayFormatted}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-7.5 sm:h-8 px-2.5 sm:px-3 rounded-xl border border-[#F0DED4] bg-white text-[11px] sm:text-xs font-semibold text-[#7C695E] hover:bg-[#FBECE7] hover:text-[#DE896A] hover:border-[#F5D1C4] transition-all shadow-2xs cursor-pointer"
          title="Refresh dashboard data"
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-[#DE896A]" : ""}`} />
          <span className="ml-1">Refresh</span>
        </Button>
      </div>
    </div>
  );
}
