import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { courseById } from "@/data/mockData";
import type { Quiz } from "@/types";

interface QuizResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: Quiz | null;
}

export default function QuizResultsModal({ open, onOpenChange, quiz }: QuizResultsModalProps) {
  if (!quiz) return null;
  const course = courseById(quiz.courseId);
  const submissionRate = quiz.totalTrainees > 0 ? Math.round((quiz.submissions / quiz.totalTrainees) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{quiz.title}</DialogTitle>
          <DialogDescription>
            {course?.name} · {quiz.questions} questions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#6B5A52]">Status</span>
            <Badge tone={quiz.status === "published" ? "green" : "neutral"}>{quiz.status}</Badge>
          </div>

          <div className="rounded-lg bg-[#FFFBF9] p-3">
            <div className="flex items-center justify-between text-xs text-[#8C7A70]">
              <span className="uppercase tracking-wide">Submissions</span>
              <span className="font-semibold text-[#3A2A22]">
                {quiz.submissions}/{quiz.totalTrainees}
              </span>
            </div>
            <ProgressBar value={submissionRate} className="mt-2" />
          </div>

          <div className="rounded-lg bg-[#FFFBF9] p-3">
            <div className="flex items-center justify-between text-xs text-[#8C7A70]">
              <span className="uppercase tracking-wide">Average score</span>
              <span className="font-semibold text-[#3A2A22]">
                {quiz.status === "published" ? `${quiz.avgScore}%` : "—"}
              </span>
            </div>
            <ProgressBar value={quiz.avgScore} className="mt-2" />
          </div>

          {quiz.submissions === 0 && (
            <p className="text-center text-sm text-[#B7A79D]">No trainees have submitted this quiz yet.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
