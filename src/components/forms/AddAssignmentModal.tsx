import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { courses } from "@/data/mockData";
import { useContent } from "@/context/ContentContext";

interface AddAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormValues {
  title: string;
  courseId: string;
  dueDate: string;
}

function formatDueDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(",", "");
}

export default function AddAssignmentModal({ open, onOpenChange }: AddAssignmentModalProps) {
  const { addAssignment } = useContent();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { title: "", courseId: courses[0]?.id ?? "", dueDate: "" },
  });

  useEffect(() => {
    if (open) reset({ title: "", courseId: courses[0]?.id ?? "", dueDate: "" });
  }, [open, reset]);

  function onSubmit(values: FormValues) {
    addAssignment({ title: values.title, courseId: values.courseId, dueDate: formatDueDate(values.dueDate) });
    toast.success(`Assignment "${values.title}" created`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Assignment</DialogTitle>
          <DialogDescription>Trainees will submit work for you to review and score.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Assignment title"
            placeholder="e.g. Build Your First Claude Prompt Library"
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
            type="date"
            label="Due date"
            error={errors.dueDate?.message}
            {...register("dueDate", { required: "Due date is required" })}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Assignment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
