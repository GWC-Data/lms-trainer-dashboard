import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
function formatDuration(totalSeconds) {
    if (!Number.isFinite(totalSeconds))
        return "0:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
export default function UploadVideoModal({ open, onOpenChange, defaultCourseId }) {
    const { addVideo } = useContent();
    const [selected, setSelected] = useState(null);
    const [duration, setDuration] = useState(null);
    const [fileError, setFileError] = useState("");
    const { register, handleSubmit, reset, setValue, formState: { errors }, } = useForm({
        defaultValues: { title: "", courseId: defaultCourseId ?? courses[0]?.id ?? "" },
    });
    useEffect(() => {
        if (open) {
            reset({ title: "", courseId: defaultCourseId ?? courses[0]?.id ?? "" });
            setSelected((prev) => {
                if (prev)
                    URL.revokeObjectURL(prev.url);
                return null;
            });
            setDuration(null);
            setFileError("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, defaultCourseId]);
    function handleFileSelected(file) {
        setSelected((prev) => {
            if (prev)
                URL.revokeObjectURL(prev.url);
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
        if (!selected)
            return;
        const probe = document.createElement("video");
        probe.preload = "metadata";
        probe.onloadedmetadata = () => setDuration(formatDuration(probe.duration));
        probe.src = selected.url;
        return () => {
            probe.onloadedmetadata = null;
        };
    }, [selected]);
    function onSubmit(values) {
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
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Upload Video" }), _jsx(DialogDescription, { children: "Upload a session recording or reference video." })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [_jsx(FileDropzone, { accept: { "video/*": [] }, file: selected?.file ?? null, onFileSelected: handleFileSelected, hint: "MP4, MOV, WebM...", error: fileError }), _jsx(Input, { label: "Title", placeholder: "e.g. Anatomy of a Good Prompt", error: errors.title?.message, ...register("title", { required: "Title is required" }) }), _jsx(Select, { label: "Course", ...register("courseId", { required: true }), children: courses.map((c) => (_jsxs("option", { value: c.id, children: [c.name, " \u2014 ", c.level] }, c.id))) }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), children: "Cancel" }), _jsx(Button, { type: "submit", children: "Upload Video" })] })] })] }) }));
}
