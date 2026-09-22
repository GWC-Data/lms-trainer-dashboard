import { Link } from "react-router-dom";
import { Calendar, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { DashboardScheduleItem } from "@/services/api";

interface ScheduleCardProps {
  upcomingSchedule: DashboardScheduleItem[];
  isPastSession: (item: DashboardScheduleItem) => boolean;
  className?: string;
}

export default function ScheduleCard({
  upcomingSchedule,
  isPastSession,
  className,
}: ScheduleCardProps) {
  return (
    <Card className={cn("w-full min-w-0 max-w-full rounded-xl sm:rounded-2xl border border-[#F0DED4] bg-white shadow-xs overflow-hidden flex flex-col justify-between", className)}>
      <CardHeader className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 border-b border-[#F5E2DA]/80 px-3.5 sm:px-4.5 py-3 bg-[#FFFDFB]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-[#FBECE7] text-[#DE896A]">
            <Calendar className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base font-bold text-[#2E1F18] truncate">
              Upcoming Schedule
            </CardTitle>
            <p className="text-[11px] text-[#8C7A70] truncate">Timeline of scheduled classes</p>
          </div>
        </div>
        {upcomingSchedule.length > 0 && upcomingSchedule[0].batchCode && (
          <Badge tone="neutral" className="text-[9.5px] font-semibold shrink-0 self-start sm:self-center">
            Batch {upcomingSchedule[0].batchCode}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-3 sm:p-4 pt-3.5 space-y-3 flex-1 flex flex-col justify-between">
        {upcomingSchedule.length === 0 ? (
          <div className="py-6 text-center">
            <Calendar className="mx-auto h-7 w-7 text-[#D8C7BE] mb-1.5" />
            <p className="text-xs font-semibold text-[#6B5A52]">No upcoming sessions scheduled</p>
            <p className="text-[10.5px] text-[#B7A79D] mt-0.5">Check calendar for future classes</p>
          </div>
        ) : (
          <div className="relative pl-3.5 space-y-3 before:absolute before:left-[6px] before:top-2 before:bottom-2 before:w-0.5 before:bg-[#F5E2DA]">
            {upcomingSchedule.map((item, idx) => {
              const isPast = isPastSession(item);
              return (
                <div key={`${item.id || 'session'}-${idx}`} className="relative group flex items-start gap-2.5">
                  {/* Timeline Node */}
                  <div
                    className={`absolute -left-3.5 mt-1.5 h-2 w-2 rounded-full ${
                      isPast
                        ? "bg-emerald-500 ring-3 ring-emerald-50"
                        : item.isToday
                        ? "bg-[#DE896A] ring-3 ring-[#DE896A]/20 animate-pulse"
                        : "bg-[#D8C7BE]"
                    }`}
                  />
                  <div className="min-w-0 flex-1 rounded-xl border border-[#F0DED4] bg-[#FFFBF9] p-2.5 sm:p-3 transition-colors hover:border-[#DE896A]/40 hover:bg-white">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#A49288]">
                        {item.date} · {item.time}
                      </span>
                      {isPast && (
                        <Badge tone="green" className="text-[8.5px] px-1.5 py-0">
                          Completed
                        </Badge>
                      )}
                      {item.batch && (
                        <span className="text-[10.5px] font-semibold text-[#7C695E]">
                          {item.batch}
                        </span>
                      )}
                    </div>

                    <p
                      className={`mt-0.5 text-xs sm:text-[13px] font-bold text-[#2E1F18] truncate ${
                        isPast ? "opacity-60 line-through" : ""
                      }`}
                      title={item.title}
                    >
                      {item.title}
                    </p>

                    {item.description && (
                      <p
                        className={`text-[11px] text-[#8C7A70] line-clamp-2 mt-0.5 leading-relaxed ${
                          isPast ? "opacity-60" : ""
                        }`}
                      >
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Link to="/calendar" className="block pt-0.5 mt-auto">
          <Button
            variant="subtle"
            size="sm"
            className="w-full justify-center text-xs font-semibold py-1.5 rounded-xl border border-[#F0DED4] bg-white text-[#7C695E] hover:bg-[#FBECE7] hover:text-[#DE896A] hover:border-[#F5D1C4] transition-colors shadow-2xs h-8 cursor-pointer"
          >
            Open Full Calendar View <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
