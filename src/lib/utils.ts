import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Demo/mock documents have no real file behind them — this generates a small
// text stand-in from the document's metadata so Download always produces a file.
export function downloadPlaceholderFile(doc: {
  title: string;
  fileType: string;
  courseName?: string;
  uploadedAt: string;
  size: string;
}) {
  const content = [
    doc.title,
    "",
    `Type: ${doc.fileType}`,
    `Course: ${doc.courseName ?? "—"}`,
    `Uploaded: ${doc.uploadedAt}`,
    `Size: ${doc.size}`,
    "",
    "This is placeholder content for demo data — no original file is stored for this document.",
  ].join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${doc.title.replace(/[^a-z0-9]+/gi, "_")}.txt`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
