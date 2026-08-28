import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import FileDropzone, { formatFileSize } from "@/components/ui/FileDropzone";
import { courses } from "@/data/mockData";
import { useContent } from "@/context/ContentContext";

interface UploadDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCourseId?: string;
}

interface FormValues {
  title: string;
  courseId: string;
}

interface SelectedFile {
  file: File;
  url: string;
}

function fileTypeFromName(name: string): string {
  const ext = name.split(".").pop();
  return ext ? ext.toUpperCase() : "FILE";
}

export default function UploadDocumentModal({ open, onOpenChange, defaultCourseId }: UploadDocumentModalProps) {
  const { addDocument } = useContent();
  const [selected, setSelected] = useState<SelectedFile | null>(null);
  const [fileError, setFileError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { title: "", courseId: defaultCourseId ?? courses[0]?.id ?? "" },
  });

  useEffect(() => {
    if (open) {
      reset({ title: "", courseId: defaultCourseId ?? courses[0]?.id ?? "" });
      setSelected((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return null;
      });
      setFileError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultCourseId]);

  function handleFileSelected(file: File) {
    setSelected((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
    setFileError("");
    setValue("title", file.name.replace(/\.[^/.]+$/, ""));
  }

  function onSubmit(values: FormValues) {
    if (!selected) {
      setFileError("Please choose a file");
      return;
    }
    addDocument({
      title: values.title,
      courseId: values.courseId,
      fileType: fileTypeFromName(selected.file.name),
      size: formatFileSize(selected.file.size),
      fileUrl: selected.url,
    });
    toast.success(`"${values.title}" uploaded`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>Attach reference material or a study guide.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FileDropzone
            accept={{
              "application/pdf": [".pdf"],
              "application/msword": [".doc"],
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
              "application/vnd.ms-powerpoint": [".ppt"],
              "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
              "application/vnd.ms-excel": [".xls"],
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            }}
            file={selected?.file ?? null}
            onFileSelected={handleFileSelected}
            hint="PDF, DOCX, PPTX, XLSX..."
            error={fileError}
          />
          <Input
            label="Title"
            placeholder="e.g. Prompting Techniques Cheatsheet"
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Upload Document</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
