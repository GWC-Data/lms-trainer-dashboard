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
  getModulesForCourseApi,
  getLessonsForModuleApi,
  uploadDocumentApi,
  type BackendBatchItem,
  type BackendModuleSimpleItem,
  type BackendLessonItem,
  type TrainerCourseItem,
} from "@/services/api";

interface UploadDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBatchId?: string;
  onSuccess?: () => void;
}

interface FormValues {
  title: string;
  batchId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
}

interface SelectedFile {
  file: File;
  url: string;
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
  onSuccess,
}: UploadDocumentModalProps) {
  const [batches, setBatches] = useState<BackendBatchItem[]>([]);
  const [allCourses, setAllCourses] = useState<TrainerCourseItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [modules, setModules] = useState<BackendModuleSimpleItem[]>([]);
  const [lessons, setLessons] = useState<BackendLessonItem[]>([]);

  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
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
      courseId: "",
      moduleId: "",
      lessonId: "",
    },
  });

  const batchId = watch("batchId");
  const courseId = watch("courseId");
  const moduleId = watch("moduleId");
  const lessonId = watch("lessonId");

  // Step 1: Fetch authorized batches and all real courses from BigQuery when modal opens
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
            : batchList[0]?.id ?? "";

        reset({
          title: "",
          batchId: initialBatchId,
          courseId: "",
          moduleId: "",
          lessonId: "",
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

  // Step 2: When Batch changes -> reset Course, Module, Lesson; resolve Course for selected Batch
  useEffect(() => {
    setValue("courseId", "");
    setValue("moduleId", "");
    setValue("lessonId", "");
    setCourses([]);
    setModules([]);
    setLessons([]);

    if (!open || !batchId) return;

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
      setValue("courseId", courseOpt.id);
    } else if (foundBatch?.course?.courseName) {
      // Fallback from batch join if course exists in Courses table
      const courseOpt: CourseOption = {
        id: targetCourseId,
        name: foundBatch.course.courseName,
      };
      setCourses([courseOpt]);
      setValue("courseId", courseOpt.id);
    } else {
      // If batch has no valid course in BigQuery Courses table
      setCourses([]);
      setValue("courseId", "");
    }
  }, [open, batchId, batches, allCourses, setValue]);

  // Step 3: When Course changes -> reset Module, Lesson; load Modules for Course
  useEffect(() => {
    setValue("moduleId", "");
    setValue("lessonId", "");
    setModules([]);
    setLessons([]);

    if (!open || !courseId) return;

    let cancelled = false;
    setLoadingModules(true);
    getModulesForCourseApi(courseId)
      .then((res) => {
        if (cancelled) return;
        const moduleList = res.modules || [];
        setModules(moduleList);
        if (moduleList.length > 0) {
          setValue("moduleId", moduleList[0].id);
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

  // Step 4: When Module changes -> reset Lesson; load Lessons for Module & Course
  useEffect(() => {
    setValue("lessonId", "");
    setLessons([]);

    if (!open || !moduleId) return;

    let cancelled = false;
    setLoadingLessons(true);
    getLessonsForModuleApi(moduleId, courseId)
      .then((lessonList) => {
        if (cancelled) return;
        setLessons(lessonList);
        if (lessonList.length > 0) {
          setValue("lessonId", lessonList[0].id);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load lessons for module:", err);
        setLessons([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingLessons(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, moduleId, courseId, setValue]);

  function handleFileSelected(file: File) {
    setSelected((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
    setFileError("");
    setValue("title", file.name.replace(/\.[^/.]+$/, ""));
  }

  async function onSubmit(values: FormValues) {
    if (!selected) {
      setFileError("Please choose a file");
      return;
    }
    if (!values.batchId) {
      setSubmitError("Please select a batch.");
      return;
    }
    if (!values.courseId) {
      setSubmitError("Please select a course.");
      return;
    }
    if (!values.moduleId) {
      setSubmitError("Please select a module.");
      return;
    }
    if (!values.lessonId) {
      setSubmitError("Please select a lesson.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append("file", selected.file);
      formData.append("title", values.title.trim());
      formData.append("batchId", values.batchId);
      formData.append("courseId", values.courseId);
      formData.append("moduleId", values.moduleId);
      formData.append("lessonId", values.lessonId);

      const res = await uploadDocumentApi(formData);
      if (res.success) {
        toast.success(`"${values.title}" uploaded`);
        onSuccess?.();
        onOpenChange(false);
      } else {
        setSubmitError(res.message || "Failed to upload document.");
      }
    } catch (err: any) {
      console.error("Error uploading document:", err);
      const msg = extractErrorMessage(err);
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Material</DialogTitle>
          <DialogDescription>Attach reference material or a study guide.</DialogDescription>
        </DialogHeader>

        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 1. File Upload */}
          <FileDropzone
            accept={{
              "application/pdf": [".pdf"],
              "application/msword": [".doc"],
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
              "application/vnd.ms-powerpoint": [".ppt"],
              "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
              "application/vnd.ms-excel": [".xls"],
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
              "text/plain": [".txt"],
            }}
            file={selected?.file ?? null}
            onFileSelected={handleFileSelected}
            hint="PDF, DOCX, PPTX, XLSX, TXT..."
            error={fileError}
          />

          {/* 2. Document Title */}
          <Input
            label="Title"
            placeholder="e.g. Prompting Techniques Cheatsheet"
            error={errors.title?.message}
            {...register("title", { required: "Title is required" })}
          />

          {/* 3. Batch */}
          <Select
            label="Batch"
            disabled={loadingBatches}
            error={errors.batchId?.message}
            {...register("batchId", { required: "Batch is required" })}
          >
            {loadingBatches ? (
              <option value="">Loading batches...</option>
            ) : batches.length === 0 ? (
              <option value="">No authorized batches available</option>
            ) : (
              <>
                <option value="">Select Batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchName || (b as any).name}
                  </option>
                ))}
              </>
            )}
          </Select>

          {/* 4. Course (Read-only / Locked determined by Batch) */}
          <Select
            label="Course"
            disabled={true}
            error={errors.courseId?.message}
            {...register("courseId", { required: "Course is required" })}
          >
            {loadingCourses ? (
              <option value="">Resolving course...</option>
            ) : !batchId ? (
              <option value="">Select Batch first</option>
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

          {/* 5. Module */}
          <Select
            label="Module"
            disabled={loadingModules || !courseId || modules.length === 0}
            error={errors.moduleId?.message}
            {...register("moduleId", { required: "Module is required" })}
          >
            {loadingModules ? (
              <option value="">Loading modules...</option>
            ) : !courseId ? (
              <option value="">Select Course first</option>
            ) : modules.length === 0 ? (
              <option value="">No modules found for this course</option>
            ) : (
              <>
                <option value="">Select Module</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.moduleName || m.title || `Module ${m.id}`}
                  </option>
                ))}
              </>
            )}
          </Select>

          {/* 6. Lesson */}
          <Select
            label="Lesson"
            disabled={loadingLessons || !moduleId || lessons.length === 0}
            error={errors.lessonId?.message}
            {...register("lessonId", { required: "Lesson is required" })}
          >
            {loadingLessons ? (
              <option value="">Loading lessons...</option>
            ) : !moduleId ? (
              <option value="">Select Module first</option>
            ) : lessons.length === 0 ? (
              <option value="">No lessons found for this module</option>
            ) : (
              <>
                <option value="">Select Lesson</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.lessonTitle}
                  </option>
                ))}
              </>
            )}
          </Select>

          {/* 7. Upload Document Button */}
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
                !moduleId ||
                !lessonId ||
                lessons.length === 0
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
