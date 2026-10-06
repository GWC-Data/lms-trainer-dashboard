import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Download,
  FileText,
  FileSpreadsheet,
  BookOpen,
  Layers,
  FolderOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatFileSize } from "@/components/ui/FileDropzone";
import { triggerDownload } from "@/lib/utils";
import { type BackendDocumentItem } from "@/services/api";
import { cn } from "@/lib/utils";

interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: BackendDocumentItem | null;
  onDownload?: (document: BackendDocumentItem) => void;
}

const fileToneMap: Record<string, "red" | "blue" | "amber" | "green" | "neutral"> = {
  PDF: "red",
  DOCX: "blue",
  DOC: "blue",
  PPTX: "amber",
  PPT: "amber",
  XLSX: "green",
  XLS: "green",
  TXT: "neutral",
};

function cleanDisplayString(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/\s*-\s*cid-[a-zA-Z0-9_-]+/gi, "")
    .replace(/\s*-\s*[0-9a-fA-F-]{36}/gi, "")
    .replace(/^cid-[a-zA-Z0-9_-]+\s*/gi, "")
    .replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/gi, "")
    .trim();
}

function getFileExtension(fileUrl?: string, fileType?: string): string {
  if (fileType) {
    const ft = fileType.toLowerCase();
    if (ft.includes("pdf")) return "PDF";
    if (ft.includes("word") || ft.includes("docx")) return "DOCX";
    if (ft.includes("doc")) return "DOC";
    if (ft.includes("spreadsheet") || ft.includes("excel") || ft.includes("xlsx")) return "XLSX";
    if (ft.includes("xls")) return "XLS";
  }
  if (!fileUrl) return "FILE";
  try {
    const pathname = new URL(fileUrl).pathname;
    const ext = pathname.split(".").pop()?.toUpperCase().trim();
    return ext || "FILE";
  } catch {
    const cleanUrl = fileUrl.split("?")[0].split("#")[0];
    const ext = cleanUrl.split(".").pop()?.toUpperCase().trim();
    return ext || "FILE";
  }
}

function formatSafeFileUrl(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname
      .split("/")
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join("/");
    return parsed.toString();
  } catch {
    return encodeURI(url);
  }
}

export default function DocumentPreviewModal({
  open,
  onOpenChange,
  document: doc,
  onDownload,
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setLoading(true);
    }
  }, [open, doc?.id]);

  if (!doc) return null;

  const extension = getFileExtension(doc.fileUrl, doc.fileType);
  const isPdf = extension === "PDF";
  const isWord = extension === "DOC" || extension === "DOCX";
  const isExcel = extension === "XLS" || extension === "XLSX";
  const cleanTitle = cleanDisplayString(doc.title) || "Document";
  const cleanCourse = cleanDisplayString(doc.courseName);
  const cleanBatch = cleanDisplayString(doc.batchName);
  const cleanModule = cleanDisplayString(doc.moduleName);
  const fileSizeStr = doc.fileSize ? formatFileSize(doc.fileSize) : doc.size || null;
  const safeUrl = formatSafeFileUrl(doc.fileUrl || "");

  const handleDownloadClick = () => {
    if (onDownload) {
      onDownload(doc);
    } else if (doc.fileUrl) {
      triggerDownload(doc.fileUrl, doc.title);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-5xl h-[88vh] max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl border-[#F5E2DA] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#F5E2DA] bg-white px-6 py-4 shrink-0">
          <div className="min-w-0 pr-8">
            <div className="flex items-center gap-2">
              <Badge tone="neutral" className="text-[10px] font-bold uppercase tracking-wider">
                Document Preview
              </Badge>
              <Badge tone={fileToneMap[extension] || "neutral"} className="text-[10px] font-bold">
                {extension}
              </Badge>
            </div>
            <h3 className="mt-1 text-base sm:text-lg font-bold text-[#3A2A22] truncate" title={cleanTitle}>
              {cleanTitle}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8C7A70]">
              {cleanCourse && (
                <span className="flex items-center gap-1 truncate max-w-[220px]" title={cleanCourse}>
                  <BookOpen className="h-3 w-3 text-[#DE896A] shrink-0" />
                  <span className="truncate">{cleanCourse}</span>
                </span>
              )}
              {cleanBatch && (
                <span className="flex items-center gap-1 truncate max-w-[180px]" title={cleanBatch}>
                  <Layers className="h-3 w-3 text-purple-500 shrink-0" />
                  <span className="truncate">{cleanBatch}</span>
                </span>
              )}
              {cleanModule && (
                <span className="flex items-center gap-1 truncate max-w-[200px]" title={cleanModule}>
                  <FolderOpen className="h-3 w-3 text-blue-500 shrink-0" />
                  <span className="truncate">{cleanModule}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="relative flex-1 w-full bg-[#FAF5F2] overflow-hidden flex flex-col">
          {!doc.fileUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
              <AlertCircle className="h-12 w-12 text-[#C7B6AC] mb-3" />
              <h4 className="text-base font-bold text-[#3A2A22]">No File Available</h4>
              <p className="text-xs text-[#8C7A70] max-w-sm mt-1">
                This document entry does not have an attached file URL in storage.
              </p>
            </div>
          ) : isPdf ? (
            <div className="relative flex-1 w-full h-full bg-[#F0EBE8]">
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10">
                  <Loader2 className="h-8 w-8 text-[#DE896A] animate-spin mb-2" />
                  <p className="text-xs font-semibold text-[#8C7A70]">Loading PDF preview...</p>
                </div>
              )}
              <iframe
                src={safeUrl}
                title={cleanTitle}
                className="w-full h-full border-0"
                onLoad={() => setLoading(false)}
              />
            </div>
          ) : (
            <div className="flex-1 w-full flex flex-col items-center justify-center p-8 bg-[#FFFBF9] text-center">
              <div
                className={cn(
                  "h-20 w-20 rounded-2xl flex items-center justify-center mb-4 shadow-xs",
                  isWord
                    ? "bg-blue-50 text-blue-600"
                    : isExcel
                    ? "bg-green-50 text-green-600"
                    : "bg-[#FBECE7] text-[#DE896A]"
                )}
              >
                {isExcel ? (
                  <FileSpreadsheet className="h-10 w-10" />
                ) : (
                  <FileText className="h-10 w-10" />
                )}
              </div>

              <Badge tone={fileToneMap[extension] || "neutral"} className="text-xs font-bold px-3 py-1 mb-3">
                {extension} File
              </Badge>

              <h4 className="text-base font-bold text-[#3A2A22]">Preview Not Available</h4>
              <p className="text-xs sm:text-sm text-[#8C7A70] max-w-md mt-1.5 leading-relaxed">
                In-app preview is not available for this file type ({extension}). Use Download to open the file.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={handleDownloadClick}
                  className="rounded-xl px-5 py-2.5 text-xs font-semibold shadow-xs"
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Download {cleanTitle}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#F5E2DA] bg-[#FFFBF9] px-6 py-3 shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-[#8C7A70] truncate mr-2">
            <span>
              Format: <strong className="font-semibold text-[#3A2A22]">{extension}</strong>
            </span>
            {fileSizeStr && (
              <>
                <span>·</span>
                <span>
                  Size: <strong className="font-semibold text-[#3A2A22]">{fileSizeStr}</strong>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-xl border-[#F0DED4] bg-white px-4 text-xs font-semibold text-[#7C695E] hover:bg-[#FBECE7] hover:text-[#DE896A]"
            >
              Close
            </Button>
            {doc.fileUrl && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadClick}
                className="h-9 rounded-xl px-4 text-xs font-semibold text-white shadow-xs"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
