import { useEffect, useState, useCallback } from "react";
import { Plus, ClipboardList, Zap, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import QuizFormModal from "@/components/forms/QuizFormModal";
import QuizResultsModal from "@/components/forms/QuizResultsModal";
import { getQuizzesApi, deleteQuizApi, type BackendQuizItem } from "@/services/api";
import type { Quiz } from "@/types";
import { toast } from "sonner";

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState<BackendQuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [resultsQuiz, setResultsQuiz] = useState<Quiz | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getQuizzesApi();
      setQuizzes(data);
    } catch (err: any) {
      console.error("Failed to load quizzes:", err);
      setError("Failed to load quizzes. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  function openCreate() {
    setEditingQuiz(null);
    setFormOpen(true);
  }

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Are you sure you want to delete the quiz "${title}"?`)) return;

    setDeletingId(id);
    try {
      const res = await deleteQuizApi(id);
      if (res.success) {
        toast.success(`Quiz "${title}" deleted successfully.`);
        await fetchQuizzes();
      } else {
        toast.error(res.message || "Failed to delete quiz.");
      }
    } catch (err: any) {
      console.error("Error deleting quiz:", err);
      toast.error(err?.response?.data?.message || "Failed to delete quiz.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#3A2A22]">Quizzes</h1>
          <p className="flex items-center gap-1.5 text-sm text-[#8C7A70]">
            <Zap className="h-3.5 w-3.5 text-[#DE896A]" /> Auto-evaluated by the system the moment a trainee submits.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Create Quiz
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-[#8C7A70]">
          <Loader2 className="h-6 w-6 animate-spin text-[#DE896A] mr-2" />
          <span>Loading quizzes...</span>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            onClick={fetchQuizzes}
            className="ml-3 font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && quizzes.length === 0 && (
        <p className="text-sm text-[#B7A79D]">No quizzes yet — create one to get started.</p>
      )}

      {!loading && quizzes.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {quizzes.map((q) => {
            const submissions = q.submissions ?? 0;
            const totalTrainees = q.totalTrainees ?? 0;
            const avgScore = q.avgScore ?? 0;
            const totalQuestions = q.totalQuestions ?? 0;
            const isPublished = q.status?.toLowerCase() === "published" || q.status?.toLowerCase() === "active";
            const submissionRate = totalTrainees > 0 ? Math.round((submissions / totalTrainees) * 100) : 0;

            const modalQuiz: Quiz = {
              id: q.id,
              title: q.title,
              courseId: q.courseId,
              batchId: q.batchId,
              moduleId: q.moduleId,
              courseName: q.courseName,
              batchName: q.batchName,
              moduleName: q.moduleName,
              questions: totalQuestions,
              totalQuestions: totalQuestions,
              submissions,
              totalTrainees,
              avgScore,
              status: isPublished ? "published" : "draft"
            };

            return (
              <Card key={q.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A]">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#3A2A22]">{q.title}</p>
                        <p className="truncate text-xs text-[#8C7A70]">
                          {q.courseName || q.courseId}
                          {q.batchName ? ` · ${q.batchName}` : ""}
                          {q.moduleName ? ` · ${q.moduleName}` : ""}
                        </p>
                        <p className="text-[11px] text-[#B7A79D] mt-0.5">
                          {totalQuestions} questions
                          {q.createdAt ? ` · Created ${new Date(q.createdAt).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge tone={isPublished ? "green" : "neutral"}>
                      {isPublished ? "Published" : "Draft"}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-[#FFFBF9] p-3">
                      <p className="text-[10px] uppercase tracking-wide text-[#B7A79D]">Submissions</p>
                      <p className="mt-1 text-sm font-semibold text-[#3A2A22]">
                        {submissions}/{totalTrainees}
                      </p>
                      <ProgressBar value={submissionRate} className="mt-2" />
                    </div>
                    <div className="rounded-lg bg-[#FFFBF9] p-3">
                      <p className="text-[10px] uppercase tracking-wide text-[#B7A79D]">Average Score</p>
                      <p className="mt-1 text-sm font-semibold text-[#3A2A22]">
                        {isPublished ? `${avgScore}%` : "—"}
                      </p>
                      <ProgressBar value={avgScore} className="mt-2" />
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 justify-center"
                      onClick={() => setResultsQuiz(modalQuiz)}
                    >
                      View Results
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                      disabled={deletingId === q.id}
                      onClick={() => handleDelete(q.id, q.title)}
                      title="Delete quiz"
                    >
                      {deletingId === q.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <QuizFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        quiz={editingQuiz}
        onSuccess={fetchQuizzes}
      />
      <QuizResultsModal
        open={Boolean(resultsQuiz)}
        onOpenChange={(open) => !open && setResultsQuiz(null)}
        quiz={resultsQuiz}
      />
    </div>
  );
}
