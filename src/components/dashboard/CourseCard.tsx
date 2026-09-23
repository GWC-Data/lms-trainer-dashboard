import { Link } from "react-router-dom";
import { BookOpen, ArrowUpRight, Laptop, MapPin, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { DashboardCourse } from "@/services/api";

interface CourseCardProps {
  courses: DashboardCourse[];
  getModes: (mode: string) => string[];
  className?: string;
}

export default function CourseCard({ courses, getModes, className }: CourseCardProps) {
  return (
    <Card className={cn("w-full min-w-0 max-w-full rounded-xl sm:rounded-2xl border border-[#F0DED4] bg-white shadow-xs overflow-hidden flex flex-col justify-between", className)}>
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#F5E2DA]/80 px-3.5 sm:px-5 py-3 bg-[#FFFDFB]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A]">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base font-bold text-[#2E1F18] truncate">
              Courses
            </CardTitle>
            <p className="text-[11px] sm:text-[11.5px] text-[#8C7A70] truncate">
              Assigned courses across delivery modes
            </p>
          </div>
        </div>
        <Link to="/courses" className="shrink-0 ml-2">
          <Button
            variant="ghost"
            size="sm"
            className="group h-7.5 px-2.5 text-xs font-semibold text-[#DE896A] hover:bg-[#FBECE7] hover:text-[#C26D4D] gap-1 rounded-lg border border-transparent hover:border-[#F5D1C4] transition-all cursor-pointer"
          >
            <span>View all</span>
            <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="space-y-2.5 p-3 sm:p-4">
        {courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#F0DED4] bg-[#FFFBF9] p-6 sm:p-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A] mb-2.5">
              <BookOpen className="h-5 w-5" />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-[#3A2A22]">No assigned courses found</p>
            <p className="text-xs text-[#8C7A70] mt-0.5">
              You currently do not have courses assigned to your profile.
            </p>
          </div>
        ) : (
          courses.map((c, idx) => {
            const modes = getModes(c.deliveryMode);
            return (
              <div
                key={`${c.id || 'course'}-${idx}`}
                className="group relative flex flex-col gap-2.5 sm:gap-3 rounded-xl border border-[#F0DED4] bg-[#FFFDFB] p-2.5 sm:p-3.5 transition-all duration-200 hover:border-[#DE896A]/50 hover:bg-white hover:shadow-xs bento-card sm:flex-row sm:items-center sm:justify-between w-full min-w-0"
              >
                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <p
                        className="text-xs sm:text-sm font-bold text-[#2E1F18] break-words leading-snug group-hover:text-[#DE896A] transition-colors"
                        title={c.name}
                      >
                        {c.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {modes.map((mode) => (
                          <Badge
                            key={mode}
                            tone={mode.toLowerCase() === "online" ? "blue" : "amber"}
                            className="text-[9px] sm:text-[9.5px] px-1.5 py-0 font-semibold shrink-0"
                          >
                            {mode.toLowerCase() === "online" ? (
                              <Laptop className="h-2.5 w-2.5 mr-1" />
                            ) : (
                              <MapPin className="h-2.5 w-2.5 mr-1" />
                            )}
                            {mode}
                          </Badge>
                        ))}
                        <Badge tone="neutral" className="text-[9px] sm:text-[9.5px] px-1.5 py-0 font-medium shrink-0">
                          {c.batches} batch{c.batches === 1 ? "" : "es"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10.5px] sm:text-[11px] font-medium text-[#8C7A70] flex-wrap">
                      <span>{c.trainees} trainees</span>
                      <span className="text-[#D8C7BE]">·</span>
                      <span>{c.domains} domains</span>
                      <span className="text-[#D8C7BE]">·</span>
                      <span>{c.hours} hrs total</span>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                      <ProgressBar
                        value={c.avgProgress}
                        className="w-full max-w-[120px] sm:max-w-[190px] h-1.5 bg-[#F5E2DA]"
                        barClassName="bg-gradient-to-r from-[#DE896A] to-[#E59779]"
                      />
                      <span className="text-[10.5px] sm:text-[11px] font-bold text-[#6B5A52]">
                        {c.avgProgress}% avg
                        {c.batches > 1 && (
                          <span className="font-normal text-[#8C7A70] hidden sm:inline">
                            {" "}across {c.batches} batches
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Next Session metadata */}
                <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F5E2DA]/60 w-full sm:w-auto">
                  <div className="flex items-center gap-1 text-[10.5px] font-semibold text-[#8C7A70]">
                    <Clock className="h-3 w-3 text-[#DE896A]" />
                    <span>Next session</span>
                  </div>
                  <span
                    className="rounded-lg bg-[#FFF8F6] border border-[#F5E2DA] px-2 py-0.5 text-[11px] font-bold text-[#3A2A22] max-w-full truncate"
                    title={c.nextSession || "No upcoming session"}
                  >
                    {c.nextSession || "No upcoming session"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
