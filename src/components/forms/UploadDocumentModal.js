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
function fileTypeFromName(name) {
    const ext = name.split(".").pop();
    return ext ? ext.toUpperCase() : "FILE";
}
export default function UploadDocumentModal({ open, onOpenChange, defaultCourseId }) {
    const { addDocument } = useContent();
    const [selected, setSelected] = useState(null);
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
        setValue("title", file.name.replace(/\.[^/.]+$/, ""));
    }
    function onSubmit(values) {
        if (!selected) {
            setFileError("Please choose a file");
            return;
        }
        addDocument({
            title: values.title,
            courseId: values.courseId,
            fileType: fileTypeFromName(selected.file.name),
            size: formatFileSize(selected.file.size),
            fileUrl: selected.url,
        });
        toast.success(`"${values.title}" uploaded`);
        onOpenChange(false);
    }
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Upload Document" }), _jsx(DialogDescription, { children: "Attach reference material or a study guide." })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [_jsx(FileDropzone, { accept: {
                                "application/pdf": [".pdf"],
                                "application/msword": [".doc"],
                                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
                                "application/vnd.ms-powerpoint": [".ppt"],
                                "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
                                "application/vnd.ms-excel": [".xls"],
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
                            }, file: selected?.file ?? null, onFileSelected: handleFileSelected, hint: "PDF, DOCX, PPTX, XLSX...", error: fileError }), _jsx(Input, { label: "Title", placeholder: "e.g. Prompting Techniques Cheatsheet", error: errors.title?.message, ...register("title", { required: "Title is required" }) }), _jsx(Select, { label: "Course", ...register("courseId", { required: true }), children: courses.map((c) => (_jsxs("option", { value: c.id, children: [c.name, " \u2014 ", c.level] }, c.id))) }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), children: "Cancel" }), _jsx(Button, { type: "submit", children: "Upload Document" })] })] })] }) }));
}
