import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  getTrainerBatchesApi,
  getTrainerCoursesApi,
  createAssignmentApi,
  type BackendBatchItem,
  type TrainerCourseItem,
} from "@/services/api";

interface AddAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBatchId?: string;
  onSuccess?: () => void;
}

interface FormValues {
  title: string;
  batchId: string;
  courseId: string;
  dueDate: string;
}

interface CourseOption {
  id: string;
  name: string;
}

function cleanDisplayString(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/\s*-\s*cid-[a-zA-Z0-9_-]+/gi, "")
    .replace(/\s*-\s*[0-9a-fA-F-]{36}/gi, "")
    .replace(/^cid-[a-zA-Z0-9_-]+\s*/gi, "")
    .trim();
}

function extractErrorMessage(err: any): string {
  const status = err?.response?.status;
  const data = err?.response?.data;

  let serverMsg: string | undefined;
  if (data) {
    if (typeof data === "string") {
      serverMsg = data;
    } else if (typeof data.message === "string" && data.message.trim()) {
      serverMsg = data.message.trim();
    } else if (data.hint) {
      if (typeof data.hint === "string") {
        serverMsg = data.hint;
      } else if (typeof data.hint === "object") {
        serverMsg = Object.values(data.hint).join("; ");
      }
    } else if (Array.isArray(data.errors) && data.errors.length > 0) {
      serverMsg = data.errors.map((e: any) => e.msg || e.message || String(e)).join("; ");
    } else if (typeof data.error === "string" && data.error.trim()) {
      serverMsg = data.error.trim();
    }
  }

  if (status === 400) {
    return serverMsg || "Invalid request. Please check batch and course selection.";
  }
  if (status === 401) {
    return serverMsg || "Your session has expired. Please log in again.";
  }
  if (status === 403) {
    return serverMsg || "You are not authorized to create assignments for this batch/course.";
  }
  if (status === 404) {
    return serverMsg || "The selected batch or course was not found.";
  }
  if (status && status >= 500) {
    return serverMsg || "Server error while creating assignment. Please try again.";
  }

  return serverMsg || err?.message || "Failed to create assignment. Please try again.";
}

export default function AddAssignmentModal({
  open,
  onOpenChange,
  defaultBatchId,
  onSuccess,
}: AddAssignmentModalProps) {
  const [batches, setBatches] = useState<BackendBatchItem[]>([]);
  const [allCourses, setAllCourses] = useState<TrainerCourseItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: "",
      batchId: defaultBatchId ?? "",
      courseId: "",
      dueDate: "",
    },
  });

  const titleValue = watch("title");
  const batchId = watch("batchId");
  const courseId = watch("courseId");
  const dueDate = watch("dueDate");

  // Step 1: Load trainer's authorized batches and real courses when modal opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingBatches(true);
    setLoadingCourses(true);
    setSubmitError(null);

    Promise.all([
      getTrainerBatchesApi(),
      getTrainerCoursesApi().catch(() => ({ courses: [] })),
    ])
      .then(([batchList, coursesRes]) => {
        if (cancelled) return;
        setBatches(batchList);
        setAllCourses(coursesRes?.courses || []);

        const initialBatchId =
          defaultBatchId && batchList.some((b) => b.id === defaultBatchId)
            ? defaultBatchId
            : batchList.length === 1
            ? batchList[0].id
            : "";

        reset({
          title: "",
          batchId: initialBatchId,
          courseId: "",
          dueDate: "",
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load batches or courses:", err);
        setBatches([]);
        toast.error("Failed to load authorized batches.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingBatches(false);
          setLoadingCourses(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, defaultBatchId, reset]);

  // Step 2: Auto-resolve real Course from selected Batch (locked)
  useEffect(() => {
    setValue("courseId", "");
    setCourses([]);

    if (!open || !batchId) return;

    const foundBatch = batches.find((b) => b.id === batchId);
    const targetCourseId = foundBatch?.courseId || foundBatch?.course?.id;

    if (!targetCourseId) {
      setCourses([]);
      return;
    }

    const matched = allCourses.find((c) => (c.id || (c as any).courseId) === targetCourseId);
    if (matched) {
      const courseOpt: CourseOption = {
        id: matched.id || (matched as any).courseId,
        name: matched.courseName || (matched as any).name,
      };
      setCourses([courseOpt]);
      setValue("courseId", courseOpt.id, { shouldValidate: true });
    } else if (foundBatch?.course?.courseName) {
      const courseOpt: CourseOption = {
        id: targetCourseId,
        name: foundBatch.course.courseName,
      };
      setCourses([courseOpt]);
      setValue("courseId", courseOpt.id, { shouldValidate: true });
    } else {
      setCourses([]);
      setValue("courseId", "");
    }
  }, [open, batchId, batches, allCourses, setValue]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    if (!values.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!values.batchId) {
      toast.error("Please select a batch.");
      return;
    }
    if (!values.courseId) {
      toast.error("No course resolved for the selected batch.");
      return;
    }
    if (!values.dueDate) {
      toast.error("Please select a due date.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await createAssignmentApi({
        title: values.title.trim(),
        batchId: values.batchId.trim(),
        courseId: values.courseId.trim(),
        dueDate: values.dueDate,
      });

      if (res.success) {
        toast.success(`Assignment "${values.title}" created successfully`);
        reset();
        onOpenChange(false);
        onSuccess?.();
      } else {
        const errorMsg = res.message || "Failed to create assignment.";
        setSubmitError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      console.error("Assignment create error:", err);
      const errorMsg = extractErrorMessage(err);
      setSubmitError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Assignment</DialogTitle>
          <DialogDescription>
            Trainees in the selected batch will receive this assignment to complete and submit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
              {submitError}
            </div>
          )}

          {/* 1. Assignment Title */}
          <Input
            label="Assignment title"
            placeholder="e.g. Build Your First Claude Prompt Library"
            error={errors.title?.message}
            {...register("title", { required: "Title is required" })}
          />

          {/* 2. Batch Dropdown using shadcn Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#233047] block">
              Batch <span className="text-red-500">*</span>
            </label>
            <Select
              value={batchId}
              onValueChange={(val) => setValue("batchId", val, { shouldValidate: true })}
              disabled={loadingBatches || submitting}
            >
              <SelectTrigger className="h-10 rounded-xl border-[#F0EAE6] text-xs font-medium text-[#233047]">
                <SelectValue placeholder={loadingBatches ? "Loading batches..." : "Select Batch"} />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {cleanDisplayString(b.batchName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Course (Auto-derived from batch, locked) */}
          <div className="rounded-xl border border-[#F0EAE6] bg-[#FFFBF9] px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-[#8C7A70]">Allocated Course (Locked)</p>
            <p className="text-xs font-bold text-[#233047] mt-0.5">
              {loadingCourses
                ? "Resolving course..."
                : courses.length > 0
                ? cleanDisplayString(courses[0].name)
                : batchId
                ? "No course assigned to this batch"
                : "Select a batch to resolve course"}
            </p>
          </div>

          {/* 4. Due Date */}
          <Input
            type="date"
            label="Due date"
            error={errors.dueDate?.message}
            {...register("dueDate", { required: "Due date is required" })}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || loadingBatches || batches.length === 0 || courses.length === 0}
            >
              {submitting ? "Creating..." : "Create Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
