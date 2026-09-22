import { Link } from "react-router-dom";
import { UserCheck, ArrowRight, CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { DashboardSummary } from "@/services/api";

interface MyAttendanceCardProps {
  summary: DashboardSummary;
  className?: string;
}

export default function MyAttendanceCard({ summary, className }: MyAttendanceCardProps) {
  const myAttendance = summary.myAttendance || summary.trainerAttendance;
  const hasRecords = Boolean(myAttendance && myAttendance.totalSessions > 0);
  const attendancePct =
    hasRecords && typeof myAttendance?.percentage === "number"
      ? myAttendance.percentage
      : null;

  return (
    <Card className={cn("w-full min-w-0 max-w-full rounded-xl sm:rounded-2xl border border-[#F0DED4] bg-white p-3.5 sm:p-4 shadow-xs bento-card flex flex-col justify-between", className)}>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#F5E2DA]/80">
          <div className="flex items-center gap-2">
            <div className="flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-[#FBECE7] text-[#DE896A]">
              <UserCheck className="h-3.5 w-3.5" />
            </div>
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-[#3A2A22]">
              My Attendance
            </span>
          </div>
          {attendancePct !== null ? (
            <Badge tone={attendancePct >= 80 ? "green" : "amber"} className="text-[9.5px] font-bold">
              {attendancePct}%
            </Badge>
          ) : (
            <Badge tone="neutral" className="text-[9.5px] font-bold">
              Not Recorded
            </Badge>
          )}
        </div>

        {/* Main Metric Section */}
        {attendancePct !== null ? (
          <>
            <div className="mt-3 flex items-baseline justify-between gap-2 flex-wrap">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#2E1F18] tracking-tight leading-none">
                  {attendancePct}%
                </span>
                <span className="text-xs font-semibold text-[#8C7A70]">My Attendance</span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-3 space-y-1">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#F5E2DA]">
                <div
                  className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-[#DE896A] to-[#E59779]"
                  style={{ width: `${Math.min(attendancePct, 100)}%` }}
                  title={`My Attendance: ${attendancePct}%`}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#A49288] font-medium pt-0.5">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Breakdown Pills: Present · Absent · Sessions */}
            <div className="mt-2.5 flex items-center gap-1 sm:gap-1.5 flex-wrap text-[10.5px] sm:text-[11px] font-medium text-[#6E5D53]">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#F4F9F4] border border-[#D5EAD7] px-1.5 sm:px-2 py-0.5 text-emerald-700 font-semibold shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {myAttendance?.present ?? 0} Present
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#FFF5F5] border border-[#FCDADA] px-1.5 sm:px-2 py-0.5 text-rose-700 font-semibold shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                {myAttendance?.absent ?? 0} Absent
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#FDF8F5] border border-[#F2DDD1] px-1.5 sm:px-2 py-0.5 text-[#8C5D47] font-semibold shrink-0">
                {myAttendance?.totalSessions ?? 0} Sessions
              </span>
            </div>

            <p className="text-[11px] text-[#8C7A70] pt-2 leading-relaxed">
              Admin-recorded attendance across your training sessions.
            </p>
          </>
        ) : (
          /* Zero-record Empty State */
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-[#8C7A70] tracking-tight leading-none">
                Not recorded
              </span>
            </div>

            <div className="mt-3 rounded-lg bg-[#FAF5F2] border border-[#F0DED4] p-2.5 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F5E2DA] text-[#DE896A] shrink-0">
                <CalendarClock className="h-4 w-4" />
              </div>
              <p className="text-[11px] text-[#8C7A70] leading-snug">
                No trainer attendance records available yet.
              </p>
            </div>

            <p className="text-[11px] text-[#A49288] pt-2 leading-relaxed">
              Attendance records entered by Admin will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Action to /attendance */}
      <div className="mt-3 pt-2.5 border-t border-[#F5E2DA]/60 mt-auto">
        <Link
          to="/attendance"
          className="flex items-center justify-between text-xs font-semibold text-[#DE896A] hover:text-[#C26D4D] transition-colors group cursor-pointer"
        >
          <span>View Attendance</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </Card>
  );
}
