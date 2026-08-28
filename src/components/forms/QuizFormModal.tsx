import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { courses } from "@/data/mockData";
import { useContent } from "@/context/ContentContext";
import type { Quiz } from "@/types";

interface QuizFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz?: Quiz | null;
}

interface FormValues {
  title: string;
  courseId: string;
  questions: number;
  status: Quiz["status"];
}

export default function QuizFormModal({ open, onOpenChange, quiz }: QuizFormModalProps) {
  const { addQuiz, updateQuiz } = useContent();
  const isEditing = Boolean(quiz);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { title: "", courseId: courses[0]?.id ?? "", questions: 10, status: "draft" },
  });

  useEffect(() => {
    if (open) {
      reset(
        quiz
          ? { title: quiz.title, courseId: quiz.courseId, questions: quiz.questions, status: quiz.status }
          : { title: "", courseId: courses[0]?.id ?? "", questions: 10, status: "draft" }
      );
    }
  }, [open, quiz, reset]);

  function onSubmit(values: FormValues) {
    const payload = { title: values.title, courseId: values.courseId, questions: Number(values.questions), status: values.status };
    if (quiz) {
      updateQuiz(quiz.id, payload);
      toast.success(`Quiz "${values.title}" updated`);
    } else {
      addQuiz(payload);
      toast.success(`Quiz "${values.title}" created`);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Quiz" : "Create Quiz"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update this quiz's details." : "Quizzes are auto-evaluated the moment a trainee submits."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Quiz title"
            placeholder="e.g. Prompt Engineering Quiz"
            error={errors.title?.message}
            {...register("title", { required: "Title is required" })}
          />
          <Select label="Course" {...register("courseId", { required: true })}>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.level}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            min={1}
            label="Number of questions"
            error={errors.questions?.message}
            {...register("questions", { required: true, min: { value: 1, message: "Must have at least 1 question" }, valueAsNumber: true })}
          />
          <Select label="Status" {...register("status", { required: true })}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </Select>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEditing ? "Save Changes" : "Create Quiz"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
