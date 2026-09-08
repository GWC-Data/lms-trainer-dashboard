import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import FileDropzone from "@/components/ui/FileDropzone";
import {
  getTrainerBatchesApi,
  getTrainerCoursesApi,
  getBatchDetailsApi,
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
  questions: number;
  status: "draft" | "published";
}

interface CourseOption {
  id: string;
  name: string;
}

const EXCEL_ACCEPT = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"]
};

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
    return serverMsg || "You are not authorized to create quizzes for this batch/course.";
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
    formState: { errors }
  } = useForm<FormValues>({
    defaultValues: {
      title: "",
      batchId: "",
      courseId: "",
      moduleId: "",
      questions: 10,
      status: "draft"
    }
  });

  const batchId = watch("batchId");
  const courseId = watch("courseId");

  // Step 1: When modal opens -> fetch authorized batches and real courses from BigQuery
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

        const initialBatchId = quiz?.batchId || batchList[0]?.id || "";
        reset({
          title: quiz?.title || "",
          batchId: initialBatchId,
          courseId: quiz?.courseId || "",
          moduleId: quiz?.moduleId || "",
          questions: quiz?.questions || quiz?.totalQuestions || 10,
          status: (quiz?.status?.toLowerCase() === "published" ? "published" : "draft") as "draft" | "published"
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load trainer batches or courses for quiz:", err);
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
  }, [open, quiz, reset]);

  // Step 2: When Batch changes -> reset Course and Module, load Course for selected Batch
  useEffect(() => {
    setValue("courseId", "");
    setValue("moduleId", "");
    setCourses([]);
    setModules([]);

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
        .then((detail) => {
          if (cancelled) return;
          const cId = detail?.courseId || detail?.course?.id;
          const cName = detail?.courseName || detail?.course?.courseName;
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
          console.error("Failed to load batch course:", err);
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

  // Step 3: When Course changes -> reset Module, load Modules for Course
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

  // File selection handler with strict Excel validation (.xlsx, .xls only)
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

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", values.title.trim());
      formData.append("batchId", values.batchId.trim());
      formData.append("courseId", values.courseId.trim());
      formData.append("moduleId", values.moduleId.trim());
      formData.append("numberOfQuestions", String(values.questions));
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
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 1. Quiz Title */}
          <Input
            label="Quiz title"
            placeholder="e.g. Prompt Engineering Quiz"
            error={errors.title?.message}
            {...register("title", { required: "Title is required" })}
          />

          {/* 2. Batch Dropdown (Select first) */}
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
                    {b.batchName || (b as any).name}
                  </option>
                ))}
              </>
            )}
          </Select>

          {/* 3. Course (Scoped to selected batch) */}
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

          {/* 4. Module (Belonging to selected course) */}
          <Select
            label="Module"
            error={errors.moduleId?.message}
            disabled={loadingModules || modules.length === 0 || submitting || courses.length === 0}
            {...register("moduleId", { required: "Module is required" })}
          >
            {!batchId ? (
              <option value="">Select a batch first</option>
            ) : courses.length === 0 ? (
              <option value="">No course found for this batch</option>
            ) : loadingModules ? (
              <option value="">Loading modules...</option>
            ) : modules.length === 0 ? (
              <option value="">No modules found for this course</option>
            ) : (
              modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.moduleName}
                </option>
              ))
            )}
          </Select>

          {/* 5. Number of Questions */}
          <Input
            type="number"
            min={1}
            label="Number of questions"
            error={errors.questions?.message}
            {...register("questions", {
              required: "Number of questions is required",
              min: { value: 1, message: "Must have at least 1 question" },
              valueAsNumber: true
            })}
          />

          {/* 6. Status */}
          <Select label="Status" {...register("status", { required: true })}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </Select>

          {/* 7. Excel File Upload */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#6B5A52]">Excel Question File (.xlsx, .xls)</label>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating Quiz..." : isEditing ? "Save Changes" : "Create Quiz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
