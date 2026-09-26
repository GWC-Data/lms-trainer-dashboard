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
  onError?: (err: string) => void;
  maxSize?: number;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileDropzone({
  accept,
  file,
  onFileSelected,
  hint,
  error,
  onError,
  maxSize = 50 * 1024 * 1024,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[], rejected: any[]) => {
      if (accepted && accepted[0]) {
        if (onError) onError("");
        onFileSelected(accepted[0]);
        return;
      }
      if (rejected && rejected[0]) {
        const rej = rejected[0];
        const isSizeErr = rej.errors?.some((e: any) => e.code === "file-too-large");
        if (isSizeErr) {
          const msg = `File size exceeds the allowed limit (${formatFileSize(maxSize)}).`;
          if (onError) onError(msg);
          return;
        }

        // Check if the rejected file actually has an accepted extension (e.g. browser mime quirks on Windows)
        const ext = `.${rej.file?.name?.split(".").pop()?.toLowerCase()}`;
        const acceptedExtensions = accept
          ? Object.values(accept).flat().map((e) => e.toLowerCase())
          : [];

        if (acceptedExtensions.includes(ext) && (rej.file?.size || 0) <= maxSize) {
          if (onError) onError("");
          onFileSelected(rej.file);
          return;
        }

        const msg =
          rej.errors?.[0]?.message ||
          "Unsupported file format. Please upload PDF, Word, PowerPoint, Excel, or Text.";
        if (onError) onError(msg);
      }
    },
    [onFileSelected, onError, maxSize, accept]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
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
