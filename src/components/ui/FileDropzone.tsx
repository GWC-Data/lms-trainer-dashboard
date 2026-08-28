import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  accept?: Record<string, string[]>;
  file: File | null;
  onFileSelected: (file: File) => void;
  hint?: string;
  error?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileDropzone({ accept, file, onFileSelected, hint, error }: FileDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFileSelected(accepted[0]);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false,
  });

  return (
    <div className="space-y-1">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          isDragActive ? "border-[#DE896A] bg-[#FBECE7]" : "border-[#F0DED4] bg-[#FFFBF9] hover:bg-[#FBECE7]/60",
          error && "border-red-300"
        )}
      >
        <input {...getInputProps()} />
        {file ? (
          <>
            <FileCheck2 className="h-7 w-7 text-[#DE896A]" />
            <p className="text-sm font-medium text-[#3A2A22]">{file.name}</p>
            <p className="text-xs text-[#B7A79D]">{formatFileSize(file.size)} · click or drop to replace</p>
          </>
        ) : (
          <>
            <UploadCloud className="h-7 w-7 text-[#DE896A]" />
            <p className="text-sm font-medium text-[#3A2A22]">
              {isDragActive ? "Drop the file here" : "Drag & drop a file, or click to browse"}
            </p>
            {hint && <p className="text-xs text-[#B7A79D]">{hint}</p>}
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
