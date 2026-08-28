import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, PlayCircle, Clock, HardDrive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { courseById } from "@/data/mockData";
import { useContent } from "@/context/ContentContext";
import UploadVideoModal from "@/components/forms/UploadVideoModal";
export default function Videos() {
    const { videos } = useContent();
    const [modalOpen, setModalOpen] = useState(false);
    function handlePlay(v) {
        if (v.fileUrl) {
            window.open(v.fileUrl, "_blank", "noopener,noreferrer");
        }
        else {
            toast.info("No preview available for this demo video — upload a video to try playback.");
        }
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-[#3A2A22]", children: "Videos" }), _jsx("p", { className: "text-sm text-[#8C7A70]", children: "Upload session recordings and reference videos for trainees." })] }), _jsxs(Button, { onClick: () => setModalOpen(true), children: [_jsx(Upload, { className: "h-4 w-4" }), " Upload Video"] })] }), videos.length === 0 && _jsx("p", { className: "text-sm text-[#B7A79D]", children: "No videos yet \u2014 upload one to get started." }), _jsx("div", { className: "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3", children: videos.map((v) => {
                    const course = courseById(v.courseId);
                    return (_jsxs(Card, { className: "overflow-hidden", children: [_jsxs("button", { onClick: () => handlePlay(v), className: "relative flex h-36 w-full items-center justify-center bg-gradient-to-br from-[#F5D1C4] to-[#FBECE7]", children: [_jsx(PlayCircle, { className: "h-12 w-12 text-white drop-shadow" }), _jsx("span", { className: "absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white", children: v.duration })] }), _jsxs(CardContent, { className: "p-4", children: [_jsx("p", { className: "truncate font-medium text-[#3A2A22]", children: v.title }), _jsx("p", { className: "mt-0.5 truncate text-xs text-[#B7A79D]", children: course?.name }), _jsxs("div", { className: "mt-3 flex items-center justify-between text-xs text-[#8C7A70]", children: [_jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Clock, { className: "h-3.5 w-3.5" }), " ", v.uploadedAt] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(HardDrive, { className: "h-3.5 w-3.5" }), " ", v.size] })] })] })] }, v.id));
                }) }), _jsx(UploadVideoModal, { open: modalOpen, onOpenChange: setModalOpen })] }));
}
