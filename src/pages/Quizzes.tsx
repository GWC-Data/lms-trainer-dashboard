import { useState } from "react";
import { Plus, ClipboardList, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { courseById } from "@/data/mockData";
import { useContent } from "@/context/ContentContext";
import QuizFormModal from "@/components/forms/QuizFormModal";
import QuizResultsModal from "@/components/forms/QuizResultsModal";
import type { Quiz } from "@/types";

export default function Quizzes() {
  const { quizzes } = useContent();
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [resultsQuiz, setResultsQuiz] = useState<Quiz | null>(null);

  function openCreate() {
    setEditingQuiz(null);
    setFormOpen(true);
  }

  function openEdit(quiz: Quiz) {
    setEditingQuiz(quiz);
    setFormOpen(true);
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

      {quizzes.length === 0 && <p className="text-sm text-[#B7A79D]">No quizzes yet — create one to get started.</p>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {quizzes.map((q) => {
          const course = courseById(q.courseId);
          const submissionRate = q.totalTrainees > 0 ? Math.round((q.submissions / q.totalTrainees) * 100) : 0;
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
                      <p className="truncate text-xs text-[#B7A79D]">
                        {course?.name} · {q.questions} questions
                      </p>
                    </div>
                  </div>
                  <Badge tone={q.status === "published" ? "green" : "neutral"}>{q.status}</Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[#FFFBF9] p-3">
                    <p className="text-[10px] uppercase tracking-wide text-[#B7A79D]">Submissions</p>
                    <p className="mt-1 text-sm font-semibold text-[#3A2A22]">
                      {q.submissions}/{q.totalTrainees}
                    </p>
                    <ProgressBar value={submissionRate} className="mt-2" />
                  </div>
                  <div className="rounded-lg bg-[#FFFBF9] p-3">
                    <p className="text-[10px] uppercase tracking-wide text-[#B7A79D]">Average Score</p>
                    <p className="mt-1 text-sm font-semibold text-[#3A2A22]">
                      {q.status === "published" ? `${q.avgScore}%` : "—"}
                    </p>
                    <ProgressBar value={q.avgScore} className="mt-2" />
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 justify-center" onClick={() => openEdit(q)}>
                    Edit
                  </Button>
                  <Button size="sm" className="flex-1 justify-center" onClick={() => setResultsQuiz(q)}>
                    View Results
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <QuizFormModal open={formOpen} onOpenChange={setFormOpen} quiz={editingQuiz} />
      <QuizResultsModal open={Boolean(resultsQuiz)} onOpenChange={(open) => !open && setResultsQuiz(null)} quiz={resultsQuiz} />
    </div>
  );
}
