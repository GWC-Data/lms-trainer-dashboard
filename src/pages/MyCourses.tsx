import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Laptop, MapPin, Users, Layers, Clock, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import { courses, batchesForCourse, courseModes, totalTraineesForCourse, traineesForBatch } from "@/data/mockData";
import { cn } from "@/lib/utils";

export default function MyCourses() {
  const [openId, setOpenId] = useState<string | null>(courses[0]?.id ?? null);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-[#FAF7F5] p-3 sm:p-4">
        <div className="space-y-3">
          {courses.map((c) => {
            const isOpen = openId === c.id;
            const courseBatches = batchesForCourse(c.id);
            return (
              <div
                key={c.id}
                className="overflow-hidden rounded-2xl border border-[#F0EAE6] bg-white shadow-sm shadow-black/[0.02]"
              >
                <button
                  onClick={() => setOpenId(isOpen ? null : c.id)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-[#DE896A] transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                    />
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FFFBF9] p-1">
                      <img src={c.image} alt="" className="h-full w-full object-contain" />
                    </span>
                    <span className="truncate text-lg font-bold text-[#233047]">
                      {c.name} - {c.level}
                    </span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-[#DE896A]">
                    {c.domains} Domains &bull; {c.hours} hrs
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-[#F0EAE6] px-6 py-5">
                    <div className="flex flex-col-reverse gap-6 md:flex-row md:items-start">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {courseModes(c.id).map((mode) => (
                            <Badge key={mode} tone={mode === "online" ? "blue" : "amber"}>
                              {mode === "online" ? <Laptop className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                              {mode}
                            </Badge>
                          ))}
                          <Badge tone="neutral">
                            {totalTraineesForCourse(c.id)} trainees across {courseBatches.length} batch
                            {courseBatches.length === 1 ? "" : "es"}
                          </Badge>
                        </div>

                        <p className="mt-3 text-xs text-[#B7A79D]">
                          Same curriculum, run independently — each batch below has its own trainees, its own
                          pace, and (for offline batches) its own attendance.
                        </p>

                        <div className="mt-4 space-y-2.5">
                          {courseBatches.map((b) => {
                            const batchTrainees = traineesForBatch(b.id);
                            return (
                              <div key={b.id} className="rounded-xl border border-[#F0EAE6] bg-[#FFFBF9] p-3.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-[#3A2A22]">{b.code}</span>
                                    <span className="text-xs text-[#B7A79D]">{b.label}</span>
                                    <Badge tone={b.mode === "online" ? "blue" : "amber"} className="scale-90 origin-left">
                                      {b.mode === "online" ? <Laptop className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                                      {b.mode}
                                    </Badge>
                                  </div>
                                  <Link
                                    to={b.mode === "offline" ? "/attendance" : "/trainees"}
                                    state={{ batchId: b.id }}
                                    className="text-xs font-medium text-[#DE896A] hover:underline"
                                  >
                                    {b.mode === "offline" ? "Mark Attendance" : "View Progress"} &rarr;
                                  </Link>
                                </div>

                                {b.location && (
                                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#8C7A70]">
                                    <MapPin className="h-3.5 w-3.5" /> {b.location}
                                  </p>
                                )}

                                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#8C7A70]">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3.5 w-3.5 text-[#DE896A]" /> {batchTrainees.length} trainees
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <CalendarClock className="h-3.5 w-3.5 text-[#DE896A]" /> {b.nextSession}
                                  </span>
                                </div>

                                <div className="mt-2.5">
                                  <div className="flex items-center justify-between text-[11px] text-[#8C7A70]">
                                    <span>Batch progress</span>
                                    <span className="font-semibold text-[#3A2A22]">{b.progress}%</span>
                                  </div>
                                  <ProgressBar value={b.progress} className="mt-1" />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:max-w-xs">
                          <div className="rounded-lg bg-[#FFFBF9] p-2">
                            <Layers className="mx-auto h-4 w-4 text-[#DE896A]" />
                            <p className="mt-1 text-sm font-semibold text-[#3A2A22]">{c.domains}</p>
                            <p className="text-[10px] text-[#B7A79D]">Domains</p>
                          </div>
                          <div className="rounded-lg bg-[#FFFBF9] p-2">
                            <Clock className="mx-auto h-4 w-4 text-[#DE896A]" />
                            <p className="mt-1 text-sm font-semibold text-[#3A2A22]">{c.hours}</p>
                            <p className="text-[10px] text-[#B7A79D]">Hours</p>
                          </div>
                        </div>

                        <div className="mt-5 max-w-md">
                          <Link to={`/content/modules?courseId=${c.id}`}>
                            <Button size="sm">Manage Content</Button>
                          </Link>
                        </div>
                      </div>

                      <div className="mx-auto w-40 shrink-0 overflow-hidden rounded-2xl bg-[#FFFBF9] sm:w-48 md:mx-0">
                        <img src={c.image} alt={`${c.name} — ${c.level}`} className="h-full w-full object-contain" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
