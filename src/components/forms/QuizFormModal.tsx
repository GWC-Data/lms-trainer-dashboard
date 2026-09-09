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
  getTrainerBatchesApi,
  getTrainerCoursesApi,
  getModulesForCourseApi,
  createQuizApi,
  type BackendBatchItem,
  type BackendModuleSimpleItem,
  type TrainerCourseItem,
} from "@/services/api";
import type { Quiz } from "@/types";

interface QuizFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz?: Quiz | null;
  onSuccess?: () => void;
}

interface FormValues {
  title: string;
  batchId: string;
  courseId: string;
  moduleId: string;
  numberOfQuestions?: string;
  status: "draft" | "published";
}

interface CourseOption {
  id: string;
  name: string;
}

const EXCEL_ACCEPT = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
};

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
    return serverMsg || "Invalid request. Please check quiz details and Excel file.";
  }
  if (status === 401) {
    return serverMsg || "Your session has expired. Please log in again.";
  }
  if (status === 403) {
    return serverMsg || "You are not authorized to create quizzes for this batch.";
  }
  if (status === 404) {
    return serverMsg || "The selected batch, course, or module was not found.";
  }
  if (status && status >= 500) {
    return serverMsg || "Server error while creating quiz. Please try again.";
  }

  return serverMsg || err?.message || "Failed to create quiz. Please try again.";
}

export default function QuizFormModal({ open, onOpenChange, quiz, onSuccess }: QuizFormModalProps) {
  const isEditing = Boolean(quiz);

  const [batches, setBatches] = useState<BackendBatchItem[]>([]);
  const [allCourses, setAllCourses] = useState<TrainerCourseItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [modules, setModules] = useState<BackendModuleSimpleItem[]>([]);

  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
      batchId: "",
      courseId: "",
      moduleId: "",
      numberOfQuestions: "",
      status: "published",
    },
  });

  const batchId = watch("batchId");
  const courseId = watch("courseId");
  const moduleId = watch("moduleId");
  const status = watch("status");

  // Step 1: Fetch real authorized batches & courses from API
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingBatches(true);
    setLoadingCourses(true);
    setSubmitError(null);
    setFileError("");
    setSelectedFile(null);

    Promise.all([
      getTrainerBatchesApi(),
      getTrainerCoursesApi().catch(() => ({ courses: [] })),
    ])
      .then(([batchList, coursesRes]) => {
        if (cancelled) return;
        setBatches(batchList);
        setAllCourses(coursesRes?.courses || []);

        const initialBatchId = quiz?.batchId || "";
        reset({
          title: quiz?.title || "",
          batchId: initialBatchId,
          courseId: quiz?.courseId || "",
          moduleId: quiz?.moduleId || "",
          numberOfQuestions: quiz?.totalQuestions ? String(quiz.totalQuestions) : "",
          status: quiz?.status === "draft" ? "draft" : "published",
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load batches or courses:", err);
        setBatches([]);
        toast.error("Failed to load batches.");
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
  }, [open, quiz, reset]);

  // Step 2: When Batch changes -> resolve Course automatically
  useEffect(() => {
    setValue("courseId", "");
    setValue("moduleId", "");
    setCourses([]);
    setModules([]);
    setSubmitError(null);

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
      const courseOpt: CourseOption = {
        id: targetCourseId,
        name: "Resolved Course",
      };
      setCourses([courseOpt]);
      setValue("courseId", targetCourseId, { shouldValidate: true });
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
        if (moduleList.length > 0) {
          setValue("moduleId", moduleList[0].id, { shouldValidate: true });
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
  }, [open, courseId, setValue]);

  function handleFileSelected(file: File) {
    setFileError("");
    setSubmitError(null);

    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["xlsx", "xls"];

    if (!ext || !validExtensions.includes(ext)) {
      setSelectedFile(null);
      setFileError("Invalid file type. Only Excel files (.xlsx, .xls) are allowed.");
      return;
    }

    setSelectedFile(file);
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    if (!selectedFile) {
      setFileError("An Excel question file (.xlsx or .xls) is required.");
      return;
    }

    if (!values.batchId) {
      toast.error("Please select a batch.");
      return;
    }

    if (!values.courseId) {
      toast.error("Course could not be resolved from the selected batch.");
      return;
    }

    if (!values.moduleId) {
      toast.error("Please select a module.");
      return;
    }

    // Verify module belongs to selected course
    const selectedModule = modules.find((m) => m.id === values.moduleId);
    if (selectedModule && selectedModule.courseId && selectedModule.courseId !== values.courseId) {
      toast.error("Selected module does not belong to the resolved course.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", values.title.trim());
      formData.append("batchId", values.batchId.trim());
      formData.append("courseId", values.courseId.trim());
      formData.append("moduleId", values.moduleId.trim());
      if (values.numberOfQuestions && values.numberOfQuestions.trim()) {
        formData.append("numberOfQuestions", values.numberOfQuestions.trim());
      }
      formData.append("status", values.status === "published" ? "Published" : "Draft");

      const response = await createQuizApi(formData);
      if (response.success) {
        toast.success(`Quiz "${values.title}" created successfully`);
        onSuccess?.();
        onOpenChange(false);
      } else {
        const msg = response.message || "Failed to create quiz.";
        setSubmitError(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      console.error("Error creating quiz:", err);
      const errMsg = extractErrorMessage(err);
      setSubmitError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
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

        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 1. Quiz Title */}
          <Input
            label="Quiz title *"
            placeholder="e.g. Prompt Engineering Quiz"
            error={errors.title?.message}
            {...register("title", { required: "Title is required" })}
          />

          {/* 2. Batch Dropdown using real API data */}
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
                    {cleanDisplayString(b.batchName || (b as any).name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Course (Auto-derived from batch, visually read-only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#6B5A52] block">Course</label>
            <div className="h-10 rounded-xl border border-[#F0EAE6] bg-[#FFFBF9] px-3.5 flex items-center">
              <span className="text-xs font-medium text-[#233047]">
                {loadingCourses
                  ? "Resolving course..."
                  : courses.length > 0
                  ? cleanDisplayString(courses[0].name)
                  : batchId
                  ? "No course linked to selected batch"
                  : "Select a batch to resolve course"}
              </span>
            </div>
          </div>

          {/* 4. Module Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#233047] block">
              Module <span className="text-red-500">*</span>
            </label>
            <Select
              value={moduleId}
              onValueChange={(val) => setValue("moduleId", val, { shouldValidate: true })}
              disabled={loadingModules || modules.length === 0 || submitting || !courseId}
            >
              <SelectTrigger className="h-10 rounded-xl border-[#F0EAE6] text-xs font-medium text-[#233047]">
                <SelectValue
                  placeholder={
                    loadingModules
                      ? "Loading modules..."
                      : !courseId
                      ? "Select Batch first"
                      : modules.length === 0
                      ? "No modules found"
                      : "Select Module"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {cleanDisplayString(m.moduleName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 5. Number of Questions */}
          <Input
            label="Number of Questions"
            type="number"
            min="1"
            placeholder="e.g. 10 (optional validation count)"
            error={errors.numberOfQuestions?.message}
            {...register("numberOfQuestions")}
          />

          {/* 6. Status Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#233047] block">Status</label>
            <Select
              value={status}
              onValueChange={(val) => setValue("status", val as "draft" | "published")}
              disabled={submitting}
            >
              <SelectTrigger className="h-10 rounded-xl border-[#F0EAE6] text-xs font-medium text-[#233047]">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 7. Excel File Upload */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#6B5A52]">
              Excel Question File (.xlsx, .xls) <span className="text-red-500">*</span>
            </label>
            <FileDropzone
              accept={EXCEL_ACCEPT}
              file={selectedFile}
              onFileSelected={handleFileSelected}
              hint="Only .xlsx or .xls files are supported"
              error={fileError}
            />
          </div>

          {/* 8. Action Buttons */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !selectedFile || !batchId || !moduleId}>
              {submitting ? "Creating Quiz..." : isEditing ? "Save Changes" : "Create Quiz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
