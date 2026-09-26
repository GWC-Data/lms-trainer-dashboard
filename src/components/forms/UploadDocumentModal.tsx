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
import FileDropzone from "@/components/ui/FileDropzone";
import {
  getTrainerFiltersApi,
  getModulesForCourseApi,
  uploadDocumentApi,
  type BatchFilterItem,
  type CourseFilterItem,
  type BackendModuleSimpleItem,
} from "@/services/api";

interface UploadDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBatchId?: string;
  defaultCourseId?: string;
  defaultModuleId?: string;
  onSuccess?: () => void;
}

interface FormValues {
  title: string;
  batchId: string;
  courseId: string;
  moduleId: string;
}

interface SelectedFile {
  file: File;
  url: string;
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
    return serverMsg || "Invalid request. Please check document hierarchy.";
  }
  if (status === 401) {
    return serverMsg || "Your session has expired. Please log in again.";
  }
  if (status === 403) {
    return serverMsg || "You are not authorized to upload documents for this course/batch.";
  }
  if (status === 404) {
    return serverMsg || "The selected batch, course, module, or lesson was not found.";
  }
  if (status && status >= 500) {
    return serverMsg || "Server error while uploading document. Please try again.";
  }

  return serverMsg || err?.message || "Failed to upload document. Please try again.";
}

export default function UploadDocumentModal({
  open,
  onOpenChange,
  defaultBatchId,
  defaultCourseId,
  defaultModuleId,
  onSuccess,
}: UploadDocumentModalProps) {
  const [batches, setBatches] = useState<BatchFilterItem[]>([]);
  const [allCourses, setAllCourses] = useState<CourseFilterItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [modules, setModules] = useState<BackendModuleSimpleItem[]>([]);

  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [selected, setSelected] = useState<SelectedFile | null>(null);
  const [fileError, setFileError] = useState("");

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
      courseId: defaultCourseId ?? "",
      moduleId: defaultModuleId ?? "",
    },
  });

  const batchId = watch("batchId");
  const courseId = watch("courseId");
  const moduleId = watch("moduleId");

  // Step 1: Fetch authorized batches and courses from cached trainer filters when modal opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingBatches(true);
    setLoadingCourses(true);
    setSubmitError(null);
    setFileError("");
    setSelected((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });

    getTrainerFiltersApi()
      .then(({ batches: batchList, courses: coursesRes }) => {
        if (cancelled) return;
        setBatches(batchList || []);
        setAllCourses(coursesRes || []);

        let initialBatchId = defaultBatchId;
        if (!initialBatchId && defaultCourseId) {
          const matchBatch = (batchList || []).find(
            (b) => b.courseId === defaultCourseId
          );
          if (matchBatch) initialBatchId = matchBatch.id;
        }
        if (!initialBatchId && batchList && batchList.length > 0) {
          initialBatchId = batchList[0].id;
        }

        reset({
          title: "",
          batchId: initialBatchId || "",
          courseId: "",
          moduleId: defaultModuleId || "",
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
  }, [open, defaultBatchId, defaultCourseId, defaultModuleId, reset]);

  // Step 2: When Batch changes -> resolve real Course automatically (locked)
  useEffect(() => {
    setValue("courseId", "");
    setValue("moduleId", "");
    setCourses([]);
    setModules([]);

    if (!open || !batchId) return;

    const foundBatch = batches.find((b) => b.id === batchId);
    const targetCourseId = foundBatch?.courseId;

    if (!targetCourseId) {
      setCourses([]);
      return;
    }

    const matched = allCourses.find((c) => (c.id || (c as any).courseId) === targetCourseId);
    if (matched) {
      const courseOpt: CourseOption = {
        id: matched.id || (matched as any).courseId,
        name: matched.name || (matched as any).courseName,
      };
      setCourses([courseOpt]);
      setValue("courseId", courseOpt.id);
    } else {
      setCourses([]);
      setValue("courseId", "");
    }
  }, [open, batchId, batches, allCourses, setValue]);

  // Step 3: When Course changes -> load Modules for that Course
  useEffect(() => {
    setValue("moduleId", "");
    setModules([]);

    if (!open || !courseId) return;

    let cancelled = false;
    setLoadingModules(true);
    getModulesForCourseApi(courseId)
      .then((res) => {
        if (cancelled) return;
        const moduleList = res.modules || [];
        setModules(moduleList);
        const targetModuleId =
          defaultModuleId && moduleList.some((m) => m.id === defaultModuleId)
            ? defaultModuleId
            : moduleList[0]?.id || "";
        if (targetModuleId) {
          setValue("moduleId", targetModuleId);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load modules for course:", err);
        setModules([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingModules(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, courseId, defaultModuleId, setValue]);

  function handleFileSelected(file: File) {
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    const allowed = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xlsx", ".xls", ".txt", ".csv"];
    if (!allowed.includes(ext)) {
      setFileError("Unsupported file type. Allowed formats: PDF, Word, PowerPoint, Excel, or Text.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setFileError("File size exceeds 50MB limit.");
      return;
    }
    setSelected((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
    setFileError("");
    setValue("title", file.name.replace(/\.[^/.]+$/, ""));
  }

  function handleFileRemoved() {
    setSelected((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setFileError("");
  }

  async function onSubmit(values: FormValues) {
    if (!selected?.file) {
      setFileError("Please upload a document file.");
      return;
    }
    if (!values.batchId) {
      setSubmitError("Please select a batch.");
      return;
    }
    if (!values.courseId) {
      setSubmitError("No course resolved for the selected batch.");
      return;
    }
    if (!values.moduleId) {
      setSubmitError("Please select a module.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const formData = new FormData();
      formData.append("file", selected.file);
      formData.append("title", values.title.trim());
      formData.append("batchId", values.batchId);
      formData.append("courseId", values.courseId);
      formData.append("moduleId", values.moduleId);

      const res = await uploadDocumentApi(formData);
      if (res.success) {
        toast.success(`Material "${values.title}" uploaded successfully.`);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        setSubmitError(res.message || "Failed to upload document.");
      }
    } catch (err: any) {
      console.error("Document upload error:", err);
      setSubmitError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Material</DialogTitle>
          <DialogDescription>
            Attach reference material, worksheets, or presentations to a specific module.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
              {submitError}
            </div>
          )}

          {/* 1. File Upload Dropzone */}
          <div>
            <label className="text-xs font-semibold text-[#233047] block mb-1.5">
              File <span className="text-red-500">*</span>
            </label>
            <FileDropzone
              accept={{
                "application/pdf": [".pdf"],
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
                "application/vnd.ms-excel": [".xls"],
                "application/msexcel": [".xls", ".xlsx"],
                "application/x-msexcel": [".xls", ".xlsx"],
                "application/x-ms-excel": [".xls", ".xlsx"],
                "application/x-excel": [".xls", ".xlsx"],
                "application/vnd.ms-excel.sheet.macroEnabled.12": [".xlsm"],
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
                "application/msword": [".doc"],
                "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
                "application/vnd.ms-powerpoint": [".ppt"],
                "text/plain": [".txt"],
                "text/csv": [".csv"],
                "application/csv": [".csv"],
              }}
              file={selected?.file || null}
              onFileSelected={handleFileSelected}
              onError={setFileError}
              hint="PDF, Word, PowerPoint, Excel, or Text (up to 50MB)"
              error={fileError}
            />
          </div>

          {/* 2. Material Title */}
          <Input
            label="Title"
            placeholder="e.g. Prompt Engineering Cheatsheet"
            error={errors.title?.message}
            {...register("title", { required: "Title is required" })}
          />

          {/* 3. Batch Dropdown using shadcn Select */}
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
                <SelectValue
                  placeholder={loadingBatches ? "Loading batches..." : "Select Batch"}
                />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {cleanDisplayString(b.name || (b as any).batchName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Course (Auto-Derived from Batch & Locked) */}
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

          {/* 5. Module Dropdown using shadcn Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#233047] block">
              Module <span className="text-red-500">*</span>
            </label>
            <Select
              value={moduleId}
              onValueChange={(val) => setValue("moduleId", val)}
              disabled={loadingModules || !courseId || modules.length === 0 || submitting}
            >
              <SelectTrigger className="h-10 rounded-xl border-[#F0EAE6] text-xs font-medium text-[#233047]">
                <SelectValue
                  placeholder={
                    loadingModules
                      ? "Loading modules..."
                      : !courseId
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
                    {cleanDisplayString(m.moduleName || m.title)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                !batchId ||
                !courseId ||
                !moduleId
              }
            >
              {submitting ? "Uploading..." : "Upload Material"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
