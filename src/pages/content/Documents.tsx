import { useState } from "react";
import { Upload, FileText, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { courseById } from "@/data/mockData";
import { useContent } from "@/context/ContentContext";
import UploadDocumentModal from "@/components/forms/UploadDocumentModal";
import { downloadPlaceholderFile, triggerDownload } from "@/lib/utils";
import type { DocumentAsset } from "@/types";

const fileToneMap: Record<string, "red" | "blue" | "amber" | "green"> = {
  PDF: "red",
  DOCX: "blue",
  PPTX: "amber",
  XLSX: "green",
};

export default function Documents() {
  const { documents } = useContent();
  const [modalOpen, setModalOpen] = useState(false);

  function handleDownload(d: DocumentAsset) {
    if (d.fileUrl) {
      triggerDownload(d.fileUrl, d.title);
    } else {
      downloadPlaceholderFile({
        title: d.title,
        fileType: d.fileType,
        courseName: courseById(d.courseId)?.name,
        uploadedAt: d.uploadedAt,
        size: d.size,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#3A2A22]">Documents</h1>
          <p className="text-sm text-[#8C7A70]">Reference material and study guides attached to your lessons.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Upload className="h-4 w-4" /> Upload Document
        </Button>
      </div>

      <Card>
        <CardContent className="divide-y divide-[#F5E2DA] p-0">
          {documents.length === 0 && (
            <p className="p-5 text-sm text-[#B7A79D]">No documents yet — upload one to get started.</p>
          )}
          {documents.map((d) => {
            const course = courseById(d.courseId);
            return (
              <div key={d.id} className="flex items-center justify-between gap-4 p-4 hover:bg-[#FFFBF9]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#3A2A22]">{d.title}</p>
                    <p className="truncate text-xs text-[#B7A79D]">
                      {course?.name} · {d.uploadedAt} · {d.size}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={fileToneMap[d.fileType] ?? "neutral"}>{d.fileType}</Badge>
                  <button
                    onClick={() => handleDownload(d)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8C7A70] hover:bg-[#FBECE7] hover:text-[#DE896A]"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <UploadDocumentModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
