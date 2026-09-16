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
import { getTrainerBatchesApi, createModuleApi, BackendBatchItem } from "@/services/api";

interface AddModuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBatchId?: string;
  onSuccess?: () => void;
}

interface FormValues {
  title: string;
  batchId: string;
}

function cleanDisplayString(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/\s*-\s*cid-[a-zA-Z0-9_-]+/gi, "")
    .replace(/\s*-\s*[0-9a-fA-F-]{36}/gi, "")
    .replace(/^cid-[a-zA-Z0-9_-]+\s*/gi, "")
    .trim();
}

export default function AddModuleModal({
  open,
  onOpenChange,
  defaultBatchId,
  onSuccess,
}: AddModuleModalProps) {
  const [batches, setBatches] = useState<BackendBatchItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
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
    defaultValues: { title: "", batchId: defaultBatchId ?? "" },
  });

  const selectedBatchId = watch("batchId");
  const selectedBatch = batches.find((b) => b.id === selectedBatchId);
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
          reset({ title: "", batchId: initialBatchId });
          setValue("batchId", initialBatchId);
        }
      } catch (err) {
        console.error("Failed to load batches for module modal:", err);
      } finally {
        if (isMounted) setLoadingBatches(false);
      }
    };

    fetchBatches();
    return () => {
      isMounted = false;
    };
  }, [open, defaultBatchId, reset, setValue]);

  async function onSubmit(values: FormValues) {
    if (!values.title.trim()) {
      return;
    }
    if (!values.batchId) {
      setSubmitError("Please select a batch.");
      return;
    }
    if (!derivedCourseId) {
      setSubmitError("The selected batch has no associated course. Please contact your administrator.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      const res = await createModuleApi({
        title: values.title.trim(),
        batchId: values.batchId,
        courseId: derivedCourseId,
      });

      if (res.success) {
        toast.success(`Module "${values.title}" added`);
        reset({ title: "", batchId: values.batchId });
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setSubmitError(res.message || "Failed to create module.");
      }
    } catch (err: any) {
      console.error("Error creating module:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.msg ||
        "Failed to create module. Please check your permissions.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Module</DialogTitle>
          <DialogDescription>
            Select a batch — the course is automatically resolved from it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
              {submitError}
            </div>
          )}

          <Input
            label="Module title"
            placeholder="e.g. Advanced Prompting"
            error={errors.title?.message}
            disabled={submitting}
            {...register("title", { required: "Title is required" })}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#233047] block">
              Batch <span className="text-red-500">*</span>
            </label>
            <Select
              value={selectedBatchId}
              onValueChange={(val) => setValue("batchId", val)}
              disabled={loadingBatches || submitting}
            >
              <SelectTrigger className="h-10 rounded-xl border-[#F0EAE6] text-xs font-medium text-[#233047]">
                <SelectValue
                  placeholder={loadingBatches ? "Loading batches..." : "Select Batch"}
                />
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

          {/* Show the derived course as read-only info */}
          {derivedCourseName && (
            <div className="rounded-lg bg-[#FBF5F2] border border-[#EEAF9C] px-3 py-2 text-xs text-[#8A442E]">
              <span className="font-medium">Course (auto-derived):</span> {derivedCourseName}
            </div>
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
              disabled={submitting || loadingBatches || batches.length === 0}
            >
              {submitting ? "Adding..." : "Add Module"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
