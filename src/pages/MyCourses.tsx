import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Laptop, MapPin, Users, Layers, Clock, CalendarClock, AlertCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import { getTrainerCoursesApi, TrainerCourseItem } from "@/services/api";
import { cn } from "@/lib/utils";

export default function MyCourses() {
  const [courses, setCourses] = useState<TrainerCourseItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getTrainerCoursesApi();
      if (res.success && Array.isArray(res.courses)) {
        setCourses(res.courses);
        if (res.courses.length > 0) {
          setOpenId(res.courses[0].id);
        }
      } else {
        setCourses([]);
      }
    } catch (err: any) {
      console.error("Failed to load trainer courses:", err);
      setError(err?.response?.data?.message || "Failed to load assigned courses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-[#FAF7F5] p-3 sm:p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-[#F0EAE6] bg-white p-6 shadow-sm shadow-black/[0.02] animate-pulse"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-[#FAF7F5]" />
                    <div className="space-y-2">
                      <div className="h-5 w-48 rounded bg-[#FAF7F5]" />
                      <div className="h-3 w-28 rounded bg-[#FAF7F5]" />
                    </div>
                  </div>
                  <div className="h-4 w-32 rounded bg-[#FAF7F5]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="mt-2 text-sm font-medium text-red-800">{error}</p>
            <div className="mt-4 flex justify-center">
              <button
                onClick={fetchCourses}
                className="inline-flex items-center gap-2 rounded-xl bg-[#DE896A] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#c97455] transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-2xl border border-[#F0EAE6] bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7F5] text-[#DE896A]">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#233047]">No assigned courses found.</h3>
            <p className="mt-1 text-xs text-[#8C7A70]">
              You have not been assigned to any courses yet. Please contact your system administrator.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((c) => {
              const isOpen = openId === c.id;
              const courseBatches = c.batches || [];
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
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FFFBF9] p-1 border border-[#F0EAE6]">
                        {c.image ? (
                          <img src={c.image} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <Layers className="h-5 w-5 text-[#DE896A]" />
                        )}
                      </span>
                      <span className="truncate text-lg font-bold text-[#233047]">
                        {c.name} {c.level ? `- ${c.level}` : ""}
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
                            {(c.deliveryModes || ["online"]).map((mode) => (
                              <Badge key={mode} tone={mode === "online" ? "blue" : "amber"}>
                                {mode === "online" ? <Laptop className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                                {mode}
                              </Badge>
                            ))}
                            <Badge tone="neutral">
                              {c.totalTrainees} trainees across {courseBatches.length} batch
                              {courseBatches.length === 1 ? "" : "es"}
                            </Badge>
                          </div>

                          <p className="mt-3 text-xs text-[#B7A79D]">
                            Same curriculum, run independently — each batch below has its own trainees, its own
                            pace, and (for offline batches) its own attendance.
                          </p>

                          <div className="mt-4 space-y-2.5">
                            {courseBatches.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-[#F0EAE6] bg-[#FFFBF9] p-4 text-center text-xs text-[#8C7A70]">
                                No batches currently assigned to this course.
                              </div>
                            ) : (
                              courseBatches.map((b) => (
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
                                      <Users className="h-3.5 w-3.5 text-[#DE896A]" /> {b.traineeCount} trainees
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
                              ))
                            )}
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

                        <div className="mx-auto w-40 shrink-0 overflow-hidden rounded-2xl bg-[#FFFBF9] sm:w-48 md:mx-0 flex items-center justify-center p-2 border border-[#F0EAE6]">
                          {c.image ? (
                            <img src={c.image} alt={`${c.name} — ${c.level}`} className="h-full w-full object-contain" />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center p-4">
                              <Layers className="h-10 w-10 text-[#DE896A] mb-2" />
                              <span className="text-xs font-semibold text-[#3A2A22] line-clamp-2">{c.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
