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

interface UploadVideoModalProps {
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

function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds)) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function UploadVideoModal({ open, onOpenChange, defaultCourseId }: UploadVideoModalProps) {
  const { addVideo } = useContent();
  const [selected, setSelected] = useState<SelectedFile | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
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
      setDuration(null);
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
    setDuration(null);
    setValue("title", file.name.replace(/\.[^/.]+$/, ""));
  }

  // Read the real duration from the selected file once its blob URL is in state,
  // via a hidden <video> element's metadata — kept separate so we probe the same
  // URL we keep for playback instead of minting (and then revoking) a second one.
  useEffect(() => {
    if (!selected) return;
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => setDuration(formatDuration(probe.duration));
    probe.src = selected.url;
    return () => {
      probe.onloadedmetadata = null;
    };
  }, [selected]);

  function onSubmit(values: FormValues) {
    if (!selected) {
      setFileError("Please choose a video file");
      return;
    }
    addVideo({
      title: values.title,
      courseId: values.courseId,
      duration: duration ?? "0:00",
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
          <DialogTitle>Upload Video</DialogTitle>
          <DialogDescription>Upload a session recording or reference video.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FileDropzone
            accept={{ "video/*": [] }}
            file={selected?.file ?? null}
            onFileSelected={handleFileSelected}
            hint="MP4, MOV, WebM..."
            error={fileError}
          />
          <Input
            label="Title"
            placeholder="e.g. Anatomy of a Good Prompt"
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
            <Button type="submit">Upload Video</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
