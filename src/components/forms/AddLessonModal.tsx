import { useState, useEffect } from "react";
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
import Select from "@/components/ui/Select";
import {
  getTrainerBatchesApi,
  getModulesForCourseApi,
  createLessonApi,
  BackendBatchItem,
  BackendModuleSimpleItem,
} from "@/services/api";

interface AddLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select a batch when opened from a specific batch context */
  defaultBatchId?: string;
  /** Called after a lesson is successfully created so the parent can refresh */
  onSuccess?: () => void;
}

interface FormValues {
  title: string;
  batchId: string;
  moduleId: string;
  type: string;
  duration: string;
}

const TYPE_OPTIONS = [
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
  { value: "quiz", label: "Quiz" },
  { value: "assignment", label: "Assignment" },
];

function extractLessonErrorMessage(err: any): string {
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
    return serverMsg || "Invalid request. Please check the entered lesson details.";
  }
  if (status === 401) {
    return serverMsg || "Your session has expired. Please log in again.";
  }
  if (status === 403) {
    return serverMsg || "You are not authorized to create lessons for this course.";
  }
  if (status === 404) {
    return serverMsg || "The selected course or module was not found.";
  }
  if (status && status >= 500) {
    return serverMsg || "Server error while creating lesson. Please try again.";
  }

  return serverMsg || err?.message || "Failed to create lesson. Please try again.";
}

export default function AddLessonModal({
  open,
  onOpenChange,
  defaultBatchId,
  onSuccess,
}: AddLessonModalProps) {
  const [batches, setBatches] = useState<BackendBatchItem[]>([]);
  const [modules, setModules] = useState<BackendModuleSimpleItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: "",
      batchId: defaultBatchId ?? "",
      moduleId: "",
      type: "video",
      duration: "",
    },
  });

  const batchId = watch("batchId");
  const type = watch("type");

  // Derive courseId from the selected batch
  const selectedBatch = batches.find((b) => b.id === batchId);
  const derivedCourseId = selectedBatch?.course?.id ?? selectedBatch?.courseId ?? "";
  const derivedCourseName = selectedBatch?.course?.courseName ?? "";

  // Fetch ALL batches when the modal opens
  useEffect(() => {
    if (!open) {
      setSubmitError(null);
      return;
    }

    let isMounted = true;
    const fetchBatches = async () => {
      try {
        setLoadingBatches(true);
        const list = await getTrainerBatchesApi();
        if (isMounted && Array.isArray(list)) {
          setBatches(list);
          const initialBatchId = defaultBatchId || list[0]?.id || "";
          reset({
            title: "",
            batchId: initialBatchId,
            moduleId: "",
            type: "video",
            duration: "",
          });
        }
      } catch (err) {
        console.error("Failed to load batches for lesson modal:", err);
      } finally {
        if (isMounted) setLoadingBatches(false);
      }
    };

    fetchBatches();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultBatchId]);

  // When batchId changes, derive courseId and reload modules for that course
  useEffect(() => {
    if (!derivedCourseId) {
      setModules([]);
      setValue("moduleId", "");
      return;
    }

    let isMounted = true;
    const fetchModules = async () => {
      try {
        setLoadingModules(true);
        setModules([]);
        setValue("moduleId", "");
        const res = await getModulesForCourseApi(derivedCourseId);
        if (isMounted && res.success && Array.isArray(res.modules)) {
          setModules(res.modules);
          // Pre-select the first module automatically
          const firstId = res.modules[0]?.id ?? "";
          setValue("moduleId", firstId);
        }
      } catch (err) {
        console.error("Failed to load modules for course:", err);
        if (isMounted) setModules([]);
      } finally {
        if (isMounted) setLoadingModules(false);
      }
    };

    fetchModules();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedCourseId]);

  async function onSubmit(values: FormValues) {
    if (!values.moduleId) {
      toast.error("This course has no modules yet — add a module first.");
      return;
    }
    if (!derivedCourseId) {
      toast.error("The selected batch has no associated course. Please contact your administrator.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const res = await createLessonApi({
        title: values.title,
        courseId: derivedCourseId,
        moduleId: values.moduleId,
        type: values.type,
        duration: values.type === "video" && values.duration ? values.duration : undefined,
      });

      if (res.success) {
        toast.success(`Lesson "${values.title}" added`);
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setSubmitError(res.message || "Failed to create lesson.");
      }
    } catch (err: any) {
      console.error("Error creating lesson:", err);
      const msg = extractLessonErrorMessage(err);
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Lesson</DialogTitle>
          <DialogDescription>Select a batch — the course is auto-derived. Then choose a module.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
              {submitError}
            </div>
          )}

          <Input
            label="Lesson title"
            placeholder="e.g. Anatomy of a Good Prompt"
            error={errors.title?.message}
            disabled={submitting}
            {...register("title", { required: "Title is required" })}
          />

          {/* Batch dropdown — all real batches */}
          <Select
            label="Batch"
            disabled={loadingBatches || submitting}
            {...register("batchId", { required: "Please select a batch" })}
          >
            {loadingBatches ? (
              <option value="">Loading batches...</option>
            ) : batches.length === 0 ? (
              <option value="">No batches available</option>
            ) : (
              batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchName}
                  {b.course?.courseName ? ` — ${b.course.courseName}` : ""}
                </option>
              ))
            )}
          </Select>

          {/* Show the derived course as read-only info */}
          {derivedCourseName && (
            <div className="rounded-lg bg-[#FBF5F2] border border-[#EEAF9C] px-3 py-2 text-xs text-[#8A442E]">
              <span className="font-medium">Course (auto-derived):</span> {derivedCourseName}
            </div>
          )}

          {/* Module dropdown — dynamically reloads when batch/course changes */}
          <Select
            label="Module"
            disabled={loadingModules || submitting || !derivedCourseId}
            error={
              !loadingModules && derivedCourseId && modules.length === 0
                ? "No modules in this course yet — add a module first"
                : undefined
            }
            {...register("moduleId", { required: true })}
          >
            {loadingModules ? (
              <option value="">Loading modules...</option>
            ) : modules.length === 0 ? (
              <option value="">No modules available</option>
            ) : (
              modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title || m.moduleName}
                </option>
              ))
            )}
          </Select>

          {/* Content type dropdown */}
          <Select
            label="Content type"
            disabled={submitting}
            {...register("type", { required: true })}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>

          {/* Duration — only shown for video type */}
          {type === "video" && (
            <Input
              label="Duration (optional)"
              placeholder="e.g. 12:10"
              disabled={submitting}
              {...register("duration")}
            />
          )}

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
              disabled={
                submitting ||
                loadingBatches ||
                batches.length === 0 ||
                loadingModules ||
                modules.length === 0
              }
            >
              {submitting ? "Adding..." : "Add Lesson"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
