import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
const Select = forwardRef(({ className, label, error, id, name, children, ...props }, ref) => {
    const inputId = id ?? (typeof name === "string" ? name : undefined);
    return (_jsxs("div", { className: "space-y-1", children: [label && (_jsx("label", { htmlFor: inputId, className: "text-xs font-medium text-[#6B5A52]", children: label })), _jsxs("div", { className: "relative", children: [_jsx("select", { ref: ref, id: inputId, name: name, className: cn("h-10 w-full appearance-none rounded-xl border border-[#F0DED4] bg-white px-3 pr-9 text-sm text-[#3A2A22] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20", error && "border-red-300 focus:border-red-400 focus:ring-red-200", className), ...props, children: children }), _jsx(ChevronDown, { className: "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B7A79D]" })] }), error && _jsx("p", { className: "text-xs text-red-600", children: error })] }));
});
Select.displayName = "Select";
export default Select;
