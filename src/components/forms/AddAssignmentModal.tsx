import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import {
  getTrainerBatchesApi,
  getTrainerCoursesApi,
  getBatchDetailsApi,
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
        console.error("Failed to load trainer batches or courses:", err);
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

  // Step 2: When Batch is selected -> derive Course dynamically
  useEffect(() => {
    setValue("courseId", "");
    setCourses([]);

    if (!open || !batchId) return;

    let cancelled = false;
    const foundBatch = batches.find((b) => b.id === batchId);
    const targetCourseId = foundBatch?.courseId || foundBatch?.course?.id;

    if (!targetCourseId) {
      setCourses([]);
      return;
    }

    // Resolve course against allCourses from BigQuery Courses table
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
      setLoadingCourses(true);
      getBatchDetailsApi(batchId)
        .then((details) => {
          if (cancelled) return;
          const cId = details?.courseId || details?.course?.id;
          const cName = details?.courseName || details?.course?.courseName;
          if (cId && cName) {
            const courseOpt: CourseOption = { id: cId, name: cName };
            setCourses([courseOpt]);
            setValue("courseId", cId, { shouldValidate: true });
          } else {
            setCourses([]);
          }
        })
        .catch((err) => {
          if (cancelled) return;
          console.warn("Failed to fetch batch details for course:", err);
          setCourses([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingCourses(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [open, batchId, batches, allCourses, setValue]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await createAssignmentApi({
        title: values.title.trim(),
        batchId: values.batchId.trim(),
        courseId: values.courseId.trim(),
        dueDate: values.dueDate.trim(),
      });

      if (res.success || res.statusCode === 201) {
        toast.success(`Assignment "${values.title.trim()}" created successfully!`);
        onSuccess?.();
        onOpenChange(false);
      } else {
        const errorMsg = res.message || "Failed to create assignment.";
        setSubmitError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      console.error("Assignment creation error:", err);
      const errorMsg = extractErrorMessage(err);
      setSubmitError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  const isFormValid =
    Boolean(titleValue?.trim()) &&
    Boolean(batchId?.trim()) &&
    Boolean(courseId?.trim()) &&
    Boolean(dueDate?.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Assignment</DialogTitle>
          <DialogDescription>Trainees in the selected batch will submit work for you to review and score.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
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

          {/* 2. Batch Dropdown */}
          <Select
            label="Batch"
            error={errors.batchId?.message}
            disabled={loadingBatches || submitting}
            {...register("batchId", { required: "Batch is required" })}
          >
            {loadingBatches ? (
              <option value="">Loading authorized batches...</option>
            ) : batches.length === 0 ? (
              <option value="">No authorized batches available</option>
            ) : (
              <>
                <option value="">Select a batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchName}
                  </option>
                ))}
              </>
            )}
          </Select>

          {/* 3. Course Dropdown (dynamically populated based on selected batch) */}
          <Select
            label="Course"
            error={errors.courseId?.message}
            disabled={true}
            {...register("courseId", { required: "Course is required" })}
          >
            {loadingCourses ? (
              <option value="">Resolving course...</option>
            ) : !batchId ? (
              <option value="">Select a batch first</option>
            ) : courses.length === 0 ? (
              <option value="">No course found for this batch</option>
            ) : (
              courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} 🔒
                </option>
              ))
            )}
          </Select>

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
