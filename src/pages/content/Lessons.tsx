import { useState } from "react";
import { Plus, Video, File, ClipboardList, PencilLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { courseById } from "@/data/mockData";
import { useContent } from "@/context/ContentContext";
import AddLessonModal from "@/components/forms/AddLessonModal";
import type { Lesson } from "@/types";

const typeMeta: Record<Lesson["type"], { icon: typeof Video; tone: "blue" | "green" | "orange" | "amber"; label: string }> = {
  video: { icon: Video, tone: "blue", label: "Video" },
  document: { icon: File, tone: "green", label: "Document" },
  quiz: { icon: ClipboardList, tone: "orange", label: "Quiz" },
  assignment: { icon: PencilLine, tone: "amber", label: "Assignment" },
};

export default function Lessons() {
  const { lessons, modules } = useContent();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#3A2A22]">Lessons</h1>
          <p className="text-sm text-[#8C7A70]">Each lesson can carry videos, documents, quizzes, or assignments.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> New Lesson
        </Button>
      </div>

      <Card>
        <CardContent className="divide-y divide-[#F5E2DA] p-0">
          {lessons.length === 0 && (
            <p className="p-5 text-sm text-[#B7A79D]">No lessons yet — add one to get started.</p>
          )}
          {lessons.map((l) => {
            const meta = typeMeta[l.type];
            const mod = modules.find((m) => m.id === l.moduleId);
            const course = courseById(l.courseId);
            return (
              <div key={l.id} className="flex items-center justify-between gap-4 p-4 hover:bg-[#FFFBF9]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A]">
                    <meta.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#3A2A22]">{l.title}</p>
                    <p className="truncate text-xs text-[#B7A79D]">
                      {course?.name} · {mod?.title}
                      {l.duration ? ` · ${l.duration}` : ""}
                    </p>
                  </div>
                </div>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <AddLessonModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
