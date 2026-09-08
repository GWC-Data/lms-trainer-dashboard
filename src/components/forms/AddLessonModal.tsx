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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
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
  defaultBatchId?: string;
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

function cleanDisplayString(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/\s*-\s*cid-[a-zA-Z0-9_-]+/gi, "")
    .replace(/\s*-\s*[0-9a-fA-F-]{36}/gi, "")
    .replace(/^cid-[a-zA-Z0-9_-]+\s*/gi, "")
    .trim();
}

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
  const moduleId = watch("moduleId");
  const type = watch("type");

  const selectedBatch = batches.find((b) => b.id === batchId);
  const derivedCourseId = selectedBatch?.course?.id ?? selectedBatch?.courseId ?? "";
  const derivedCourseName = cleanDisplayString(selectedBatch?.course?.courseName);

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
  }, [open, defaultBatchId, reset]);

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
        const res = await getModulesForCourseApi(derivedCourseId);
        if (isMounted && Array.isArray(res.modules)) {
          setModules(res.modules);
          if (res.modules.length > 0) {
            setValue("moduleId", res.modules[0].id);
          } else {
            setValue("moduleId", "");
          }
        }
      } catch (err) {
        console.error("Failed to load modules for lesson modal:", err);
        if (isMounted) setModules([]);
      } finally {
        if (isMounted) setLoadingModules(false);
      }
    };

    fetchModules();
    return () => {
      isMounted = false;
    };
  }, [derivedCourseId, setValue]);

  async function onSubmit(values: FormValues) {
    if (!values.title.trim()) return;
    if (!values.batchId) {
      setSubmitError("Please select a batch.");
      return;
    }
    if (!derivedCourseId) {
      setSubmitError("No course is associated with the selected batch.");
      return;
    }
    if (!values.moduleId) {
      setSubmitError("Please select a module.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const res = await createLessonApi({
        title: values.title.trim(),
        courseId: derivedCourseId,
        moduleId: values.moduleId,
        type: values.type || "video",
        duration: values.type === "video" && values.duration.trim() ? values.duration.trim() : undefined,
      });

      if (res.success) {
        toast.success(`Lesson "${values.title}" created successfully.`);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        setSubmitError(res.message || "Failed to create lesson.");
      }
    } catch (err: any) {
      console.error("Error creating lesson:", err);
      setSubmitError(extractLessonErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Lesson</DialogTitle>
          <DialogDescription>
            Select a batch — its course is automatically derived and locked.
          </DialogDescription>
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

          {/* Batch dropdown using shadcn Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#233047] block">
              Batch <span className="text-red-500">*</span>
            </label>
            <Select
              value={batchId}
              onValueChange={(val) => setValue("batchId", val)}
              disabled={loadingBatches || submitting}
            >
              <SelectTrigger className="h-10 rounded-xl border-[#F0EAE6] text-xs font-medium text-[#233047]">
                <SelectValue placeholder={loadingBatches ? "Loading batches..." : "Select Batch"} />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {cleanDisplayString(b.batchName)}
                    {b.course?.courseName ? ` — ${cleanDisplayString(b.course.courseName)}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Derived Course (Locked) */}
          {derivedCourseName && (
            <div className="rounded-xl border border-[#EEAF9C] bg-[#FBF5F2] px-3.5 py-2.5 text-xs text-[#8A442E]">
              <span className="font-semibold">Course (auto-derived):</span> {derivedCourseName}
            </div>
          )}

          {/* Module dropdown using shadcn Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#233047] block">
              Module <span className="text-red-500">*</span>
            </label>
            <Select
              value={moduleId}
              onValueChange={(val) => setValue("moduleId", val)}
              disabled={loadingModules || submitting || !derivedCourseId || modules.length === 0}
            >
              <SelectTrigger className="h-10 rounded-xl border-[#F0EAE6] text-xs font-medium text-[#233047]">
                <SelectValue
                  placeholder={
                    loadingModules
                      ? "Loading modules..."
                      : !derivedCourseId
                      ? "Select Batch first"
                      : modules.length === 0
                      ? "No modules available"
                      : "Select Module"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {cleanDisplayString(m.title || m.moduleName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Type dropdown using shadcn Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#233047] block">
              Content type <span className="text-red-500">*</span>
            </label>
            <Select
              value={type}
              onValueChange={(val) => setValue("type", val)}
              disabled={submitting}
            >
              <SelectTrigger className="h-10 rounded-xl border-[#F0EAE6] text-xs font-medium text-[#233047]">
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "video" && (
            <Input
              label="Duration (optional)"
              placeholder="e.g. 15m or 1h 30m"
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
                !derivedCourseId ||
                !moduleId
              }
            >
              {submitting ? "Creating..." : "Create Lesson"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
