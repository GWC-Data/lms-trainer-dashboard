import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { courses } from "@/data/mockData";
import { useContent } from "@/context/ContentContext";
import type { Lesson } from "@/types";

interface AddLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCourseId?: string;
}

interface FormValues {
  title: string;
  courseId: string;
  moduleId: string;
  type: Lesson["type"];
  duration: string;
}

const typeOptions: { value: Lesson["type"]; label: string }[] = [
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
  { value: "quiz", label: "Quiz" },
  { value: "assignment", label: "Assignment" },
];

export default function AddLessonModal({ open, onOpenChange, defaultCourseId }: AddLessonModalProps) {
  const { modules, addLesson } = useContent();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: "",
      courseId: defaultCourseId ?? courses[0]?.id ?? "",
      moduleId: "",
      type: "video",
      duration: "",
    },
  });

  const courseId = watch("courseId");
  const type = watch("type");
  const modulesForCourse = modules.filter((m) => m.courseId === courseId);

  useEffect(() => {
    if (open) {
      const initialCourseId = defaultCourseId ?? courses[0]?.id ?? "";
      const opts = modules.filter((m) => m.courseId === initialCourseId);
      reset({ title: "", courseId: initialCourseId, moduleId: opts[0]?.id ?? "", type: "video", duration: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultCourseId]);

  useEffect(() => {
    const opts = modules.filter((m) => m.courseId === courseId);
    if (!opts.some((m) => m.id === getValues("moduleId"))) {
      setValue("moduleId", opts[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, modules]);

  function onSubmit(values: FormValues) {
    if (!values.moduleId) {
      toast.error("This course has no modules yet — add a module first.");
      return;
    }
    addLesson({
      title: values.title,
      courseId: values.courseId,
      moduleId: values.moduleId,
      type: values.type,
      duration: values.type === "video" && values.duration ? values.duration : undefined,
    });
    toast.success(`Lesson "${values.title}" added`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Lesson</DialogTitle>
          <DialogDescription>Add a lesson to one of your modules.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Lesson title"
            placeholder="e.g. Anatomy of a Good Prompt"
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
          <Select
            label="Module"
            error={modulesForCourse.length === 0 ? "No modules in this course yet" : undefined}
            {...register("moduleId", { required: true })}
          >
            {modulesForCourse.length === 0 && <option value="">No modules available</option>}
            {modulesForCourse.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </Select>
          <Select label="Content type" {...register("type", { required: true })}>
            {typeOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          {type === "video" && (
            <Input label="Duration (optional)" placeholder="e.g. 12:10" {...register("duration")} />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Lesson</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
