import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Upload, FileText, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { courseById } from "@/data/mockData";
import { useContent } from "@/context/ContentContext";
import UploadDocumentModal from "@/components/forms/UploadDocumentModal";
import { downloadPlaceholderFile, triggerDownload } from "@/lib/utils";
const fileToneMap = {
    PDF: "red",
    DOCX: "blue",
    PPTX: "amber",
    XLSX: "green",
};
export default function Documents() {
    const { documents } = useContent();
    const [modalOpen, setModalOpen] = useState(false);
    function handleDownload(d) {
        if (d.fileUrl) {
            triggerDownload(d.fileUrl, d.title);
        }
        else {
            downloadPlaceholderFile({
                title: d.title,
                fileType: d.fileType,
                courseName: courseById(d.courseId)?.name,
                uploadedAt: d.uploadedAt,
                size: d.size,
            });
        }
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-[#3A2A22]", children: "Documents" }), _jsx("p", { className: "text-sm text-[#8C7A70]", children: "Reference material and study guides attached to your lessons." })] }), _jsxs(Button, { onClick: () => setModalOpen(true), children: [_jsx(Upload, { className: "h-4 w-4" }), " Upload Document"] })] }), _jsx(Card, { children: _jsxs(CardContent, { className: "divide-y divide-[#F5E2DA] p-0", children: [documents.length === 0 && (_jsx("p", { className: "p-5 text-sm text-[#B7A79D]", children: "No documents yet \u2014 upload one to get started." })), documents.map((d) => {
                            const course = courseById(d.courseId);
                            return (_jsxs("div", { className: "flex items-center justify-between gap-4 p-4 hover:bg-[#FFFBF9]", children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [_jsx("div", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A]", children: _jsx(FileText, { className: "h-5 w-5" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate font-medium text-[#3A2A22]", children: d.title }), _jsxs("p", { className: "truncate text-xs text-[#B7A79D]", children: [course?.name, " \u00B7 ", d.uploadedAt, " \u00B7 ", d.size] })] })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-3", children: [_jsx(Badge, { tone: fileToneMap[d.fileType] ?? "neutral", children: d.fileType }), _jsx("button", { onClick: () => handleDownload(d), className: "flex h-8 w-8 items-center justify-center rounded-lg text-[#8C7A70] hover:bg-[#FBECE7] hover:text-[#DE896A]", children: _jsx(Download, { className: "h-4 w-4" }) })] })] }, d.id));
                        })] }) }), _jsx(UploadDocumentModal, { open: modalOpen, onOpenChange: setModalOpen })] }));
}
