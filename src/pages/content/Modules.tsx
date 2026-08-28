import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Boxes, ChevronRight, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { courseById } from "@/data/mockData";
import { useContent } from "@/context/ContentContext";
import AddModuleModal from "@/components/forms/AddModuleModal";

export default function Modules() {
  const { modules } = useContent();
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);

  const filterCourseId = searchParams.get("courseId") ?? undefined;
  const filterCourse = filterCourseId ? courseById(filterCourseId) : undefined;
  const visibleModules = filterCourseId ? modules.filter((m) => m.courseId === filterCourseId) : modules;

  function clearFilter() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("courseId");
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#3A2A22]">Modules</h1>
          <p className="text-sm text-[#8C7A70]">A course contains modules, each module contains lessons.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> New Module
        </Button>
      </div>

      {filterCourse && (
        <button
          onClick={clearFilter}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#EEAF9C] bg-[#FBECE7] px-3 py-1.5 text-xs font-medium text-[#8A442E] hover:bg-[#F5D1C4]"
        >
          Filtered by: {filterCourse.name} <X className="h-3.5 w-3.5" />
        </button>
      )}

      <Card>
        <CardContent className="divide-y divide-[#F5E2DA] p-0">
          {visibleModules.length === 0 && (
            <p className="p-5 text-sm text-[#B7A79D]">No modules yet — add one to get started.</p>
          )}
          {visibleModules.map((m) => {
            const course = courseById(m.courseId);
            return (
              <div key={m.id} className="flex items-center justify-between gap-4 p-4 hover:bg-[#FFFBF9]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A]">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#3A2A22]">{m.title}</p>
                    <p className="truncate text-xs text-[#B7A79D]">
                      {course?.name} · {m.lessonsCount} lessons · updated {m.updatedAt}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone="neutral">{course?.mode}</Badge>
                  <ChevronRight className="h-4 w-4 text-[#C7B6AC]" />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <AddModuleModal open={modalOpen} onOpenChange={setModalOpen} defaultCourseId={filterCourseId} />
    </div>
  );
}
