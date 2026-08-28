import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { courses } from "@/data/mockData";
import { useContent } from "@/context/ContentContext";

interface AddModuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCourseId?: string;
}

interface FormValues {
  title: string;
  courseId: string;
}

export default function AddModuleModal({ open, onOpenChange, defaultCourseId }: AddModuleModalProps) {
  const { addModule } = useContent();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { title: "", courseId: defaultCourseId ?? courses[0]?.id ?? "" },
  });

  useEffect(() => {
    if (open) reset({ title: "", courseId: defaultCourseId ?? courses[0]?.id ?? "" });
  }, [open, defaultCourseId, reset]);

  function onSubmit(values: FormValues) {
    addModule(values);
    toast.success(`Module "${values.title}" added`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Module</DialogTitle>
          <DialogDescription>Add a new module to a course.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Module title"
            placeholder="e.g. Advanced Prompting"
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Module</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
