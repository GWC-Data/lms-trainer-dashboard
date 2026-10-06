import { useState, useEffect, useRef, useMemo } from "react";
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
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  FileQuestion,
} from "lucide-react";
import { formatFileSize } from "@/components/ui/FileDropzone";
import { triggerDownload, cleanDisplayString, cn } from "@/lib/utils";
import { type BackendDocumentItem, fetchDocumentBlob } from "@/services/api";
import { renderAsync as renderDocxAsync } from "docx-preview";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

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
  CSV: "green",
  TXT: "neutral",
};

function getFileExtension(fileUrl?: string, fileType?: string): string {
  // 1. Check URL path extension first if available
  if (fileUrl) {
    try {
      const pathname = new URL(fileUrl).pathname;
      const ext = pathname.split(".").pop()?.toUpperCase().trim();
      if (ext && ["PDF", "DOCX", "DOC", "XLSX", "XLS", "PPTX", "PPT", "CSV", "TXT"].includes(ext)) {
        return ext;
      }
    } catch {
      const cleanUrl = fileUrl.split("?")[0].split("#")[0];
      const ext = cleanUrl.split(".").pop()?.toUpperCase().trim();
      if (ext && ["PDF", "DOCX", "DOC", "XLSX", "XLS", "PPTX", "PPT", "CSV", "TXT"].includes(ext)) {
        return ext;
      }
    }
  }

  // 2. Map MIME type accurately without substring false positives
  if (fileType) {
    const ft = fileType.toLowerCase();
    if (ft.includes("pdf")) return "PDF";
    if (ft.includes("spreadsheetml") || ft.includes("xlsx")) return "XLSX";
    if (ft.includes("ms-excel") || ft.includes("excel") || ft.endsWith("/xls")) return "XLS";
    if (ft.includes("wordprocessingml") || ft.includes("docx")) return "DOCX";
    if (ft.includes("msword") || ft === "application/doc" || ft.endsWith("/doc")) return "DOC";
    if (ft.includes("presentationml") || ft.includes("pptx")) return "PPTX";
    if (ft.includes("powerpoint") || ft.endsWith("/ppt")) return "PPT";
    if (ft.includes("csv")) return "CSV";
    if (ft.includes("plain") || ft.includes("txt")) return "TXT";
  }

  return "FILE";
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

function getColumnLetter(colIndex: number): string {
  let label = "";
  let num = colIndex;
  while (num >= 0) {
    label = String.fromCharCode((num % 26) + 65) + label;
    num = Math.floor(num / 26) - 1;
  }
  return label;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DOCX / DOC Viewer Component
// ─────────────────────────────────────────────────────────────────────────────
function DocxViewer({
  arrayBuffer,
  title,
  extension,
  onDownload,
}: {
  arrayBuffer: ArrayBuffer;
  title: string;
  extension: string;
  onDownload: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(true);
  const [renderMode, setRenderMode] = useState<"docx" | "mammoth" | "legacy-error">("docx");
  const [mammothHtml, setMammothHtml] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100);

  useEffect(() => {
    let active = true;
    setRendering(true);
    setRenderError(null);

    async function parseAndRender() {
      if (!containerRef.current) return;

      // 1. Try rendering with docx-preview for high-fidelity Word layout
      try {
        containerRef.current.innerHTML = "";
        await renderDocxAsync(arrayBuffer, containerRef.current, undefined, {
          className: "docx-preview-doc",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });
        if (active) {
          setRenderMode("docx");
          setRendering(false);
          return;
        }
      } catch (err: any) {
        console.warn("docx-preview failed, attempting mammoth fallback:", err);
      }

      // 2. Try mammoth fallback to convert DOCX to HTML
      try {
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (active) {
          if (result.value && result.value.trim().length > 0) {
            setMammothHtml(result.value);
            setRenderMode("mammoth");
            setRendering(false);
            return;
          }
        }
      } catch (mammothErr: any) {
        console.warn("mammoth conversion also failed:", mammothErr);
      }

      // 3. If both failed, it may be a legacy Word 97-2003 binary (.doc) file
      if (active) {
        setRenderMode("legacy-error");
        setRenderError(
          extension === "DOC"
            ? "This document is in legacy Word 97-2003 format (.DOC). In-app browser rendering requires the modern OpenXML (.DOCX) standard. Please download the file to open it in Microsoft Word."
            : "The document structure could not be parsed by the in-browser viewer. Use Download to open the original file."
        );
        setRendering(false);
      }
    }

    parseAndRender();

    return () => {
      active = false;
    };
  }, [arrayBuffer, extension]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 175));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 60));
  const handleZoomReset = () => setZoom(100);

  if (renderMode === "legacy-error") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#FFFBF9] text-center">
        <div className="h-16 w-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-xs">
          <FileText className="h-8 w-8" />
        </div>
        <Badge tone="blue" className="text-xs font-bold px-3 py-1 mb-3">
          {extension} Document
        </Badge>
        <h4 className="text-base font-bold text-[#3A2A22]">
          {extension === "DOC" ? "Legacy Word Format (.DOC)" : "Document Preview Unavailable"}
        </h4>
        <p className="text-xs sm:text-sm text-[#8C7A70] max-w-md mt-1.5 leading-relaxed">
          {renderError}
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button
            variant="primary"
            onClick={onDownload}
            className="rounded-xl px-5 py-2.5 text-xs font-semibold shadow-xs"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Download Original {title}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col h-full overflow-hidden bg-[#F6F1EC]">
      {rendering && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center bg-[#FAF5F2]/95 backdrop-blur-2xs">
          <Loader2 className="h-9 w-9 text-[#DE896A] animate-spin mb-3" />
          <h4 className="text-sm font-semibold text-[#3A2A22]">Rendering {extension} content...</h4>
          <p className="text-xs text-[#8C7A70] mt-1">Converting document structure to in-app view</p>
        </div>
      )}
      {/* Viewer Toolbar */}
      <div className="flex items-center justify-between border-b border-[#EADBCE] bg-[#FAF5F2] px-4 py-2 shrink-0">
        <div className="flex items-center gap-2 text-xs font-medium text-[#7C695E]">
          <span className="flex items-center gap-1.5 font-semibold text-[#3A2A22]">
            <FileText className="h-3.5 w-3.5 text-blue-600" />
            {extension} Preview
          </span>
          <span className="text-[#C7B6AC]">·</span>
          <span>{renderMode === "docx" ? "High-Fidelity Layout" : "HTML Document View"}</span>
        </div>
        <div className="flex items-center gap-1 bg-white border border-[#EADBCE] rounded-lg p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom out"
            className="p-1.5 hover:bg-[#FAF5F2] rounded text-[#7C695E] hover:text-[#3A2A22] transition-colors"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomReset}
            title="Reset zoom"
            className="px-2 py-1 text-[11px] font-semibold text-[#7C695E] hover:text-[#3A2A22] hover:bg-[#FAF5F2] rounded"
          >
            {zoom}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom in"
            className="p-1.5 hover:bg-[#FAF5F2] rounded text-[#7C695E] hover:text-[#3A2A22] transition-colors"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Document Scroll Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start">
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            transition: "transform 0.15s ease",
          }}
          className="w-full max-w-4xl"
        >
          {renderMode === "docx" ? (
            <div
              ref={containerRef}
              className="docx-viewer-host bg-white shadow-md rounded-xl p-6 sm:p-10 border border-[#EADBCE] text-[#3A2A22] min-h-[600px] overflow-x-auto"
            />
          ) : (
            <div
              className="mammoth-content bg-white shadow-md rounded-xl p-8 sm:p-12 border border-[#EADBCE] text-[#3A2A22] min-h-[600px] prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: mammothHtml }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. XLSX / XLS Spreadsheet Viewer Component
// ─────────────────────────────────────────────────────────────────────────────
function SpreadsheetViewer({
  arrayBuffer,
  title,
  extension,
}: {
  arrayBuffer: ArrayBuffer;
  title: string;
  extension: string;
}) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [parseError, setParseError] = useState<string | null>(null);
  const rowsPerPage = 100;

  useEffect(() => {
    try {
      const wb = XLSX.read(arrayBuffer, { type: "array" });
      setWorkbook(wb);
      setActiveSheetIndex(0);
      setPage(1);
      setParseError(null);
    } catch (err: any) {
      console.error("Failed to parse spreadsheet:", err);
      setParseError("Could not parse spreadsheet data. The file may be password protected or corrupted.");
    }
  }, [arrayBuffer]);

  // Read active sheet data
  const { sheetNames, currentSheetName, allRows, maxCols } = useMemo(() => {
    if (!workbook || !workbook.SheetNames.length) {
      return { sheetNames: [], currentSheetName: "", allRows: [], maxCols: 0 };
    }
    const names = workbook.SheetNames;
    const safeIdx = Math.min(Math.max(0, activeSheetIndex), names.length - 1);
    const sName = names[safeIdx] || "";
    const sheet = workbook.Sheets[sName];
    if (!sheet) {
      return { sheetNames: names, currentSheetName: sName, allRows: [], maxCols: 0 };
    }
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });
    let max = 0;
    rows.forEach((r) => {
      if (Array.isArray(r) && r.length > max) max = r.length;
    });
    return {
      sheetNames: names,
      currentSheetName: sName,
      allRows: rows,
      maxCols: Math.max(max, 1),
    };
  }, [workbook, activeSheetIndex]);

  // Filter rows by search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return allRows;
    const q = searchQuery.toLowerCase().trim();
    return allRows.filter((row) =>
      row.some((cell) => String(cell ?? "").toLowerCase().includes(q))
    );
  }, [allRows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const currentPageRows = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, page, rowsPerPage]);

  const handleSheetSwitch = (index: number) => {
    setActiveSheetIndex(index);
    setPage(1);
    setSearchQuery("");
  };

  if (parseError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#FFFBF9] text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
        <h4 className="text-base font-bold text-[#3A2A22]">Spreadsheet Parsing Failed</h4>
        <p className="text-xs text-[#8C7A70] max-w-sm mt-1">{parseError}</p>
      </div>
    );
  }

  if (!workbook) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FAF5F2]">
        <Loader2 className="h-8 w-8 text-[#DE896A] animate-spin mb-2" />
        <p className="text-xs font-semibold text-[#8C7A70]">Parsing spreadsheet data...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FAF5F2]">
      {/* Spreadsheet Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EADBCE] bg-[#FAF5F2] px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3A2A22]">
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            <span>{currentSheetName}</span>
          </div>
          <Badge tone="green" className="text-[10px] font-bold">
            {allRows.length} {allRows.length === 1 ? "row" : "rows"} · {maxCols} cols
          </Badge>
          {searchQuery && (
            <Badge tone="amber" className="text-[10px] font-bold">
              {filteredRows.length} matching
            </Badge>
          )}
        </div>

        {/* Search & Pagination */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C7A70]" />
            <input
              type="text"
              placeholder="Search sheet..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="h-8 pl-8 pr-2.5 text-xs rounded-lg border border-[#EADBCE] bg-white text-[#3A2A22] focus:outline-none focus:border-[#DE896A] w-40 sm:w-52 placeholder-[#C7B6AC]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8C7A70] hover:text-[#3A2A22]"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1 bg-white border border-[#EADBCE] rounded-lg p-0.5 text-xs">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded text-[#7C695E] hover:text-[#3A2A22] disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-1.5 text-[11px] font-medium text-[#7C695E]">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded text-[#7C695E] hover:text-[#3A2A22] disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table Data View */}
      <div className="flex-1 overflow-auto bg-white">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center h-full">
            <FileSpreadsheet className="h-10 w-10 text-[#C7B6AC] mb-2" />
            <p className="text-sm font-semibold text-[#3A2A22]">
              {searchQuery ? "No matching cells found" : "This sheet is empty"}
            </p>
            <p className="text-xs text-[#8C7A70] mt-1">
              {searchQuery ? "Try refining your search keyword" : "No row data in current worksheet"}
            </p>
          </div>
        ) : (
          <table className="w-max min-w-full border-collapse text-xs select-text">
            <thead>
              <tr className="sticky top-0 z-20 bg-[#F4EFEB] text-[#7C695E]">
                <th className="sticky left-0 z-30 bg-[#ECE5E0] px-2.5 py-1.5 border border-[#E2D6CF] text-center font-mono text-[10px] w-12 shrink-0 select-none">
                  #
                </th>
                {Array.from({ length: maxCols }).map((_, cIdx) => (
                  <th
                    key={cIdx}
                    className="px-3 py-1.5 border border-[#E2D6CF] text-center font-semibold text-[11px] select-none min-w-[90px]"
                  >
                    {getColumnLetter(cIdx)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentPageRows.map((row, rIdx) => {
                const actualRowNumber = (page - 1) * rowsPerPage + rIdx + 1;
                return (
                  <tr key={rIdx} className="hover:bg-[#FFFBF9] transition-colors">
                    <td className="sticky left-0 z-10 bg-[#F7F2EE] px-2.5 py-1 border border-[#E2D6CF] text-center font-mono text-[10px] text-[#8C7A70] select-none">
                      {actualRowNumber}
                    </td>
                    {Array.from({ length: maxCols }).map((_, cIdx) => {
                      const cellVal = row[cIdx];
                      const isNumber = typeof cellVal === "number";
                      const strVal = cellVal !== undefined && cellVal !== null ? String(cellVal) : "";
                      const isMatch =
                        searchQuery &&
                        strVal.toLowerCase().includes(searchQuery.toLowerCase().trim());
                      return (
                        <td
                          key={cIdx}
                          className={cn(
                            "px-3 py-1.5 border border-[#EBE0D8] text-[#3A2A22] max-w-[320px] truncate font-normal",
                            isNumber && "text-right font-mono",
                            isMatch && "bg-amber-100 font-semibold text-amber-900"
                          )}
                          title={strVal}
                        >
                          {strVal}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Sheet Tabs Bar */}
      {sheetNames.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-1.5 bg-[#EFE9E4] border-t border-[#E5D7D0] overflow-x-auto shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A70] px-2 select-none">
            Sheets:
          </span>
          {sheetNames.map((name, idx) => {
            const isActive = idx === activeSheetIndex;
            return (
              <button
                key={name}
                type="button"
                onClick={() => handleSheetSwitch(idx)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 select-none",
                  isActive
                    ? "bg-white text-[#DE896A] shadow-xs border border-[#E0D2CA]"
                    : "text-[#7C695E] hover:bg-white/60 hover:text-[#3A2A22]"
                )}
              >
                <FileSpreadsheet className="h-3 w-3" />
                <span>{name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PDF Viewer Component
// ─────────────────────────────────────────────────────────────────────────────
function PdfViewer({
  blobUrl,
  fallbackUrl,
  title,
}: {
  blobUrl: string | null;
  fallbackUrl: string;
  title: string;
}) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const targetUrl = blobUrl || fallbackUrl;

  return (
    <div className="relative flex-1 w-full h-full bg-[#F0EBE8] overflow-hidden flex flex-col">
      {iframeLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10">
          <Loader2 className="h-8 w-8 text-[#DE896A] animate-spin mb-2" />
          <p className="text-xs font-semibold text-[#8C7A70]">Loading PDF viewer...</p>
        </div>
      )}
      <iframe
        src={`${targetUrl}#toolbar=1&navpanes=0`}
        title={title}
        className="w-full flex-1 border-0"
        onLoad={() => setIframeLoading(false)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main DocumentPreviewModal Component
// ─────────────────────────────────────────────────────────────────────────────
export default function DocumentPreviewModal({
  open,
  onOpenChange,
  document: doc,
  onDownload,
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);

  // Load document content whenever open state or document changes
  useEffect(() => {
    let active = true;

    const currentDoc = doc;
    if (!open || !currentDoc) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setBlob(null);
    setArrayBuffer(null);

    // Revoke previous blobUrl if any
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }

    async function loadDocument(targetDoc: BackendDocumentItem) {
      try {
        const fetchedBlob = await fetchDocumentBlob(targetDoc);
        if (!active) return;

        setBlob(fetchedBlob);
        const objectUrl = URL.createObjectURL(fetchedBlob);
        setBlobUrl(objectUrl);

        const ext = getFileExtension(targetDoc.fileUrl, targetDoc.fileType);
        const isWordOrExcel =
          ext === "DOCX" || ext === "DOC" || ext === "XLSX" || ext === "XLS" || ext === "CSV";

        if (isWordOrExcel) {
          const buffer = await fetchedBlob.arrayBuffer();
          if (!active) return;
          setArrayBuffer(buffer);
        }

        setLoading(false);
      } catch (err: any) {
        if (!active) return;
        console.error("Error retrieving document for preview:", err);

        // For PDF, even if blob fetch fails, we can fall back to direct fileUrl
        const ext = getFileExtension(targetDoc.fileUrl, targetDoc.fileType);
        if (ext === "PDF" && targetDoc.fileUrl) {
          setLoading(false);
          return;
        }

        setError(
          err?.message ||
            "Unable to load document contents for preview. You can use Download to view the original file."
        );
        setLoading(false);
      }
    }

    loadDocument(currentDoc);

    return () => {
      active = false;
    };
  }, [open, doc?.id, doc?.fileUrl]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  if (!doc) return null;

  const extension = getFileExtension(doc.fileUrl, doc.fileType);
  const isPdf = extension === "PDF";
  const isWord = extension === "DOC" || extension === "DOCX";
  const isExcel = extension === "XLS" || extension === "XLSX" || extension === "CSV";
  const cleanTitle = cleanDisplayString(doc.title) || "Document";
  const cleanCourse = cleanDisplayString(doc.courseName);
  const cleanBatch = cleanDisplayString(doc.batchName);
  const cleanModule = cleanDisplayString(doc.moduleName);
  const fileSizeStr = doc.fileSize ? formatFileSize(doc.fileSize) : doc.size || null;
  const safeUrl = formatSafeFileUrl(doc.fileUrl || "");

  const handleDownloadClick = () => {
    if (onDownload) {
      onDownload(doc);
    } else if (blob) {
      const u = URL.createObjectURL(blob);
      triggerDownload(u, doc.title || "document");
      setTimeout(() => URL.revokeObjectURL(u), 1000);
    } else if (doc.fileUrl) {
      triggerDownload(doc.fileUrl, doc.title);
    }
  };

  const handleOpenInNewTab = () => {
    const target = blobUrl || safeUrl;
    if (target) {
      window.open(target, "_blank");
    }
  };

  const handleRetry = () => {
    const currentDoc = doc;
    if (!currentDoc) return;
    setLoading(true);
    setError(null);
    fetchDocumentBlob(currentDoc)
      .then(async (b) => {
        setBlob(b);
        const u = URL.createObjectURL(b);
        setBlobUrl(u);
        if (isWord || isExcel) {
          const buf = await b.arrayBuffer();
          setArrayBuffer(buf);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || "Failed to retrieve document.");
        setLoading(false);
      });
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

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {(blobUrl || safeUrl) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                title="Open in new window"
                className="h-8 px-2.5 rounded-lg border-[#F0DED4] bg-white text-xs text-[#7C695E] hover:bg-[#FBECE7] hover:text-[#DE896A]"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Popout</span>
              </Button>
            )}
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="relative flex-1 w-full bg-[#FAF5F2] overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
              <Loader2 className="h-10 w-10 text-[#DE896A] animate-spin mb-3" />
              <h4 className="text-base font-bold text-[#3A2A22]">Loading Document Preview</h4>
              <p className="text-xs text-[#8C7A70] max-w-sm mt-1">
                Fetching document data and preparing in-app viewer...
              </p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#FFFBF9] text-center">
              <AlertCircle className="h-12 w-12 text-[#DE896A] mb-3" />
              <h4 className="text-base font-bold text-[#3A2A22]">Preview Load Error</h4>
              <p className="text-xs sm:text-sm text-[#8C7A70] max-w-md mt-1 leading-relaxed">{error}</p>
              <div className="mt-6 flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleRetry}
                  className="rounded-xl px-4 py-2 text-xs font-semibold border-[#F0DED4]"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Retry
                </Button>
                <Button
                  variant="primary"
                  onClick={handleDownloadClick}
                  className="rounded-xl px-5 py-2 text-xs font-semibold shadow-xs"
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Download File
                </Button>
              </div>
            </div>
          ) : !doc.fileUrl && !blob ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
              <AlertCircle className="h-12 w-12 text-[#C7B6AC] mb-3" />
              <h4 className="text-base font-bold text-[#3A2A22]">No File Available</h4>
              <p className="text-xs text-[#8C7A70] max-w-sm mt-1">
                This document entry does not have an attached file URL in storage.
              </p>
            </div>
          ) : isPdf ? (
            <PdfViewer blobUrl={blobUrl} fallbackUrl={safeUrl} title={cleanTitle} />
          ) : isWord && arrayBuffer ? (
            <DocxViewer
              arrayBuffer={arrayBuffer}
              title={cleanTitle}
              extension={extension}
              onDownload={handleDownloadClick}
            />
          ) : isExcel && arrayBuffer ? (
            <SpreadsheetViewer
              arrayBuffer={arrayBuffer}
              title={cleanTitle}
              extension={extension}
            />
          ) : (
            <div className="flex-1 w-full flex flex-col items-center justify-center p-8 bg-[#FFFBF9] text-center">
              <div className="h-20 w-20 rounded-2xl bg-[#FBECE7] text-[#DE896A] flex items-center justify-center mb-4 shadow-xs">
                <FileQuestion className="h-10 w-10" />
              </div>
              <Badge tone={fileToneMap[extension] || "neutral"} className="text-xs font-bold px-3 py-1 mb-3">
                {extension} File
              </Badge>
              <h4 className="text-base font-bold text-[#3A2A22]">In-App Preview Not Supported</h4>
              <p className="text-xs sm:text-sm text-[#8C7A70] max-w-md mt-1.5 leading-relaxed">
                Direct in-app rendering is optimized for PDF, Word (.DOCX, .DOC), and Excel (.XLSX, .XLS).
                Use Download to view this file.
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
            {(doc.fileUrl || blob) && (
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
