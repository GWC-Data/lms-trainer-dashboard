import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";
export function formatFileSize(bytes) {
    if (bytes < 1024 * 1024)
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
export default function FileDropzone({ accept, file, onFileSelected, hint, error }) {
    const onDrop = useCallback((accepted) => {
        if (accepted[0])
            onFileSelected(accepted[0]);
    }, [onFileSelected]);
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        multiple: false,
    });
    return (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { ...getRootProps(), className: cn("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors", isDragActive ? "border-[#DE896A] bg-[#FBECE7]" : "border-[#F0DED4] bg-[#FFFBF9] hover:bg-[#FBECE7]/60", error && "border-red-300"), children: [_jsx("input", { ...getInputProps() }), file ? (_jsxs(_Fragment, { children: [_jsx(FileCheck2, { className: "h-7 w-7 text-[#DE896A]" }), _jsx("p", { className: "text-sm font-medium text-[#3A2A22]", children: file.name }), _jsxs("p", { className: "text-xs text-[#B7A79D]", children: [formatFileSize(file.size), " \u00B7 click or drop to replace"] })] })) : (_jsxs(_Fragment, { children: [_jsx(UploadCloud, { className: "h-7 w-7 text-[#DE896A]" }), _jsx("p", { className: "text-sm font-medium text-[#3A2A22]", children: isDragActive ? "Drop the file here" : "Drag & drop a file, or click to browse" }), hint && _jsx("p", { className: "text-xs text-[#B7A79D]", children: hint })] }))] }), error && _jsx("p", { className: "text-xs text-red-600", children: error })] }));
}
