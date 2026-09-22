import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar, getInitials } from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { DashboardTraineeSupport } from "@/services/api";

interface SupportTraineeCardProps {
  traineesNeedingSupport: DashboardTraineeSupport[];
  onTraineeClick: (trainee: DashboardTraineeSupport) => void;
  className?: string;
}

export default function SupportTraineeCard({
  traineesNeedingSupport,
  onTraineeClick,
  className,
}: SupportTraineeCardProps) {
  const list = Array.isArray(traineesNeedingSupport) ? traineesNeedingSupport : [];

  return (
    <Card className={cn("w-full min-w-0 max-w-full rounded-xl sm:rounded-2xl border border-[#F0DED4] bg-white shadow-xs overflow-hidden flex flex-col justify-between", className)}>
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#F5E2DA]/80 px-3.5 sm:px-4.5 py-3 bg-[#FFFDFB]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <AlertCircle className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base font-bold text-[#2E1F18] truncate">
              Trainees Needing Support
            </CardTitle>
            <p className="text-[11px] text-[#8C7A70] truncate">Flagged for attendance or test criteria</p>
          </div>
        </div>
        {list.length > 0 && (
          <Badge tone="red" className="text-[9.5px] px-1.5 py-0 font-bold shrink-0 ml-1">
            {list.length}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-3 sm:p-4 pt-3 space-y-2 flex-1 flex flex-col justify-between">
        {list.length === 0 ? (
          <div className="py-5 text-center">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-1.5">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <p className="text-xs font-bold text-[#3A2A22]">All active trainees are performing well!</p>
            <p className="text-[10.5px] text-[#8C7A70] mt-0.5">
              No learners currently fall below benchmark criteria.
            </p>
          </div>
        ) : (
          list.slice(0, 5).map((t, idx) => (
            <div
              key={`${t?.id || 'trainee'}-${t?.batchId || ''}-${idx}`}
              onClick={() => onTraineeClick && onTraineeClick(t)}
              className="group flex items-start gap-2.5 rounded-xl border border-[#F0DED4] bg-[#FFFBF9] p-2.5 sm:p-3 transition-all duration-200 hover:border-[#DE896A]/50 hover:bg-white hover:shadow-xs cursor-pointer bento-card w-full min-w-0"
            >
              <Avatar
                initials={getInitials(t?.name || "T")}
                className="h-8 w-8 shrink-0 text-xs font-semibold mt-0.5 bg-[#FBECE7] text-[#DE896A]"
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <p className="text-xs sm:text-[13px] font-bold text-[#2E1F18] break-words group-hover:text-[#DE896A] transition-colors">
                    {t?.name || "Trainee"}
                  </p>
                  <Badge
                    tone="red"
                    className="text-[8.5px] px-1.5 py-0 font-bold tracking-wider shrink-0"
                  >
                    AT RISK
                  </Badge>
                </div>

                {t?.courseName && (
                  <p className="text-[11px] sm:text-[11.5px] text-[#6B5A52] break-words font-medium leading-tight" title={t.courseName}>
                    {t.courseName}
                  </p>
                )}

                <div className="flex items-center gap-1.5 text-[10.5px] text-[#8C7A70] flex-wrap">
                  {t?.batchName && (
                    <span className="font-semibold text-[#7C695E] break-words">{t.batchName}</span>
                  )}
                  {t?.batchName && t?.batchMode && <span className="text-[#D8C7BE]">·</span>}
                  {t?.batchMode && (
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#8C7A70]">
                      {t.batchMode}
                    </span>
                  )}
                </div>

                {t?.reason && (
                  <p className="text-[10.5px] text-[#C2410C] font-semibold break-words leading-tight pt-0.5" title={t.reason}>
                    {t.reason}
                  </p>
                )}
              </div>
            </div>
          ))
        )}

        <Link to="/trainees" className="block pt-0.5 mt-auto">
          <Button
            variant="subtle"
            size="sm"
            className="w-full justify-center text-xs font-semibold py-1.5 rounded-xl border border-[#F0DED4] bg-white text-[#7C695E] hover:bg-[#FBECE7] hover:text-[#DE896A] hover:border-[#F5D1C4] transition-colors shadow-2xs h-8 cursor-pointer"
          >
            View All in Trainees List <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
