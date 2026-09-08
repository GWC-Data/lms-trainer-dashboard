import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Upload, FileText, Download, Search, X, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import UploadDocumentModal from "@/components/forms/UploadDocumentModal";
import { triggerDownload } from "@/lib/utils";
import { formatFileSize } from "@/components/ui/FileDropzone";
import { getDocumentsApi, type BackendDocumentItem } from "@/services/api";

const fileToneMap: Record<string, "red" | "blue" | "amber" | "green"> = {
  PDF: "red",
  DOCX: "blue",
  DOC: "blue",
  PPTX: "amber",
  PPT: "amber",
  XLSX: "green",
  XLS: "green",
  TXT: "neutral" as any,
};

function formatDate(dateStr?: string | { value?: string }): string {
  if (!dateStr) return "";
  const raw = typeof dateStr === "object" && dateStr?.value ? dateStr.value : String(dateStr);
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return String(raw);
  }
}

export default function Documents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";

  const [documents, setDocuments] = useState<BackendDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(urlSearch);

  // Sync search input when URL changes (e.g. search from topbar)
  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDocumentsApi();
      setDocuments(res.documents || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  function handleDownload(d: BackendDocumentItem) {
    if (d.fileUrl) {
      triggerDownload(d.fileUrl, d.title);
    }
  }

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim()) {
      setSearchParams({ search: val.trim() });
    } else {
      setSearchParams({});
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchParams({});
  };

  // Filter documents by search query
  const cleanSearch = searchQuery.trim().toLowerCase();
  const filteredDocuments = useMemo(() => {
    if (!cleanSearch) return documents;
    return documents.filter((d) => {
      const titleMatch = (d.title || "").toLowerCase().includes(cleanSearch);
      const courseMatch = (d.courseName || "").toLowerCase().includes(cleanSearch);
      const batchMatch = (d.batchName || "").toLowerCase().includes(cleanSearch);
      const moduleMatch = (d.moduleName || "").toLowerCase().includes(cleanSearch);
      const typeMatch = (d.fileType || "").toLowerCase().includes(cleanSearch);
      return titleMatch || courseMatch || batchMatch || moduleMatch || typeMatch;
    });
  }, [documents, cleanSearch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#3A2A22]">Materials</h1>
          <p className="text-sm text-[#8C7A70]">Reference material and study guides attached to your lessons.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* In-page search input */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Filter materials..."
              className="h-10 w-52 sm:w-64 rounded-xl border border-[#F0DED4] bg-white pl-9 pr-8 text-sm text-[#3A2A22] placeholder:text-[#C7B6AC] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#B7A79D] hover:text-[#DE896A] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Upload className="h-4 w-4" /> Upload Material
          </Button>
        </div>
      </div>

      {/* Active Search Filter Banner */}
      {cleanSearch && (
        <div className="flex items-center justify-between rounded-xl border border-[#F0DED4] bg-[#FFFBF9] px-4 py-2.5 text-xs text-[#8C7A70]">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-[#DE896A]" />
            <span>
              Showing <strong className="text-[#3A2A22]">{filteredDocuments.length}</strong> material{filteredDocuments.length === 1 ? "" : "s"} matching "
              <strong className="text-[#DE896A]">{searchQuery}</strong>"
            </span>
          </div>
          <button
            onClick={handleClearSearch}
            className="flex items-center gap-1 font-semibold text-[#DE896A] hover:underline"
          >
            <span>Clear filter</span>
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <Card>
        <CardContent className="divide-y divide-[#F5E2DA] p-0">
          {loading ? (
            <p className="p-5 text-sm text-[#B7A79D]">Loading materials...</p>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-[#D8C7BE] mb-2" />
              <p className="text-sm font-medium text-[#3A2A22]">
                {cleanSearch ? `No materials matching "${searchQuery}"` : "No materials yet — upload one to get started."}
              </p>
              {cleanSearch && (
                <button
                  onClick={handleClearSearch}
                  className="mt-2 text-xs font-semibold text-[#DE896A] hover:underline"
                >
                  Clear search and view all
                </button>
              )}
            </div>
          ) : (
            filteredDocuments.map((d) => {
              const fileType = (d.fileType || "FILE").toUpperCase().replace(/^\./, "");
              const sizeText = d.fileSize ? formatFileSize(Number(d.fileSize)) : d.size || "";
              const dateText = formatDate(d.uploadedAt || d.createdAt);
              const metaParts = [d.courseName, d.batchName, dateText, sizeText].filter(Boolean);

              return (
                <div key={d.id} className="flex items-center justify-between gap-4 p-4 hover:bg-[#FFFBF9]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A]">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#3A2A22]">{d.title}</p>
                      <p className="truncate text-xs text-[#B7A79D]">
                        {metaParts.join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone={fileToneMap[fileType] ?? "neutral"}>{fileType}</Badge>
                    <button
                      onClick={() => handleDownload(d)}
                      title="Download file"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8C7A70] hover:bg-[#FBECE7] hover:text-[#DE896A]"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <UploadDocumentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={fetchDocuments}
      />
    </div>
  );
}
