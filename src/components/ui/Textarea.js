import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
const Textarea = forwardRef(({ className, label, error, id, name, rows = 3, ...props }, ref) => {
    const inputId = id ?? (typeof name === "string" ? name : undefined);
    return (_jsxs("div", { className: "space-y-1", children: [label && (_jsx("label", { htmlFor: inputId, className: "text-xs font-medium text-[#6B5A52]", children: label })), _jsx("textarea", { ref: ref, id: inputId, name: name, rows: rows, className: cn("w-full resize-none rounded-xl border border-[#F0DED4] bg-white px-3 py-2 text-sm text-[#3A2A22] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20", error && "border-red-300 focus:border-red-400 focus:ring-red-200", className), ...props }), error && _jsx("p", { className: "text-xs text-red-600", children: error })] }));
});
Textarea.displayName = "Textarea";
export default Textarea;
