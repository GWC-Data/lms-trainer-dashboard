import { Link } from "react-router-dom";
import { Sparkles, Boxes, UserCheck, ClipboardList, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface LearningOverviewCardProps {
  overallAvgProgress: number;
  className?: string;
}

export default function LearningOverviewCard({ overallAvgProgress, className }: LearningOverviewCardProps) {
  return (
    <Card className={cn("w-full min-w-0 max-w-full rounded-xl sm:rounded-2xl border border-[#F0DED4] bg-white p-3.5 sm:p-4 shadow-xs bento-card flex flex-col justify-between", className)}>
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-[#F5E2DA]/80">
          <div className="flex items-center gap-2">
            <div className="flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-[#FBECE7] text-[#DE896A]">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-[#3A2A22]">
              Learning Overview
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#DE896A] bg-[#FFF8F6] border border-[#F5D1C4] px-2 py-0.5 rounded-full">
            {overallAvgProgress}% Avg
          </span>
        </div>

        <div className="mt-2.5">
          <p className="text-[11.5px] text-[#7C695E] leading-relaxed">
            Quick access to manage curriculum modules, mark attendance, track quizzes, and upload materials:
          </p>
        </div>
      </div>

      {/* 2-column clean grid for quick actions */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-3 pt-2.5 border-t border-[#F5E2DA]/60 mt-auto">
        <Link
          to="/content/modules"
          className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-[#F0DED4] bg-[#FFFBF9] px-2 sm:px-2.5 py-1.5 sm:py-2 hover:bg-[#FBECE7] hover:border-[#F5D1C4] hover:text-[#DE896A] transition-colors text-[11px] sm:text-[11.5px] font-semibold text-[#6B5A52] min-w-0 truncate"
        >
          <Boxes className="h-3.5 w-3.5 text-[#DE896A] shrink-0" />
          <span className="truncate">Modules</span>
        </Link>
        <Link
          to="/attendance"
          className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-[#F0DED4] bg-[#FFFBF9] px-2 sm:px-2.5 py-1.5 sm:py-2 hover:bg-[#FBECE7] hover:border-[#F5D1C4] hover:text-[#DE896A] transition-colors text-[11px] sm:text-[11.5px] font-semibold text-[#6B5A52] min-w-0 truncate"
        >
          <UserCheck className="h-3.5 w-3.5 text-[#DE896A] shrink-0" />
          <span className="truncate">Attendance</span>
        </Link>
        <Link
          to="/quizzes"
          className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-[#F0DED4] bg-[#FFFBF9] px-2 sm:px-2.5 py-1.5 sm:py-2 hover:bg-[#FBECE7] hover:border-[#F5D1C4] hover:text-[#DE896A] transition-colors text-[11px] sm:text-[11.5px] font-semibold text-[#6B5A52] min-w-0 truncate"
        >
          <ClipboardList className="h-3.5 w-3.5 text-[#DE896A] shrink-0" />
          <span className="truncate">Quizzes</span>
        </Link>
        <Link
          to="/content/documents"
          className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-[#F0DED4] bg-[#FFFBF9] px-2 sm:px-2.5 py-1.5 sm:py-2 hover:bg-[#FBECE7] hover:border-[#F5D1C4] hover:text-[#DE896A] transition-colors text-[11px] sm:text-[11.5px] font-semibold text-[#6B5A52] min-w-0 truncate"
        >
          <FileText className="h-3.5 w-3.5 text-[#DE896A] shrink-0" />
          <span className="truncate">Materials</span>
        </Link>
      </div>
    </Card>
  );
}
