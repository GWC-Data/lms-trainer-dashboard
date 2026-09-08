import { useState, useEffect, useCallback } from "react";
import { Plus, Video, File, ClipboardList, PencilLine, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getLessonsApi, BackendLessonItem } from "@/services/api";
import AddLessonModal from "@/components/forms/AddLessonModal";

type LessonType = "video" | "document" | "quiz" | "assignment";

const typeMeta: Record<LessonType, { icon: typeof Video; tone: "blue" | "green" | "orange" | "amber"; label: string }> = {
  video: { icon: Video, tone: "blue", label: "Video" },
  document: { icon: File, tone: "green", label: "Document" },
  quiz: { icon: ClipboardList, tone: "orange", label: "Quiz" },
  assignment: { icon: PencilLine, tone: "amber", label: "Assignment" },
};

/** Normalises the raw contentType string from BigQuery to one of the 4 known types */
function resolveType(contentType: string | undefined | null): LessonType {
  const t = (contentType || "").toLowerCase();
  if (t === "video") return "video";
  if (t === "document" || t === "pdf" || t === "docx") return "document";
  if (t === "quiz") return "quiz";
  if (t === "assignment") return "assignment";
  return "document"; // safe default
}

export default function Lessons() {
  const [lessons, setLessons] = useState<BackendLessonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchLessons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getLessonsApi();
      if (res.success && Array.isArray(res.lessons)) {
        setLessons(res.lessons);
      } else {
        setLessons([]);
      }
    } catch (err: any) {
      console.error("Failed to load lessons:", err);
      setError(err?.response?.data?.message || "Failed to load lessons. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

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
          {loading ? (
            <div className="divide-y divide-[#F5E2DA]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#FAF7F5]" />
                    <div className="space-y-2">
                      <div className="h-4 w-44 rounded bg-[#FAF7F5]" />
                      <div className="h-3 w-28 rounded bg-[#FAF7F5]" />
                    </div>
                  </div>
                  <div className="h-5 w-16 rounded bg-[#FAF7F5]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <p className="mt-2 text-sm font-medium text-red-800">{error}</p>
              <div className="mt-4 flex justify-center">
                <button
                  onClick={fetchLessons}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#DE896A] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#c97455] transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            </div>
          ) : lessons.length === 0 ? (
            <p className="p-5 text-sm text-[#B7A79D]">No lessons yet — add one to get started.</p>
          ) : (
            lessons.map((l) => {
              const type = resolveType(l.contentType);
              const meta = typeMeta[type];
              return (
                <div key={l.id} className="flex items-center justify-between gap-4 p-4 hover:bg-[#FFFBF9] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A]">
                      <meta.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#3A2A22]">{l.lessonTitle}</p>
                      <p className="truncate text-xs text-[#B7A79D]">
                        {l.courseName ?? ""}
                        {l.moduleName ? ` · ${l.moduleName}` : ""}
                        {l.duration ? ` · ${l.duration}` : ""}
                      </p>
                    </div>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <AddLessonModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={fetchLessons}
      />
    </div>
  );
}
