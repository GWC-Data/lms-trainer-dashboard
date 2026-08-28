import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
const variantClasses = {
    primary: "bg-[#DE896A] text-white shadow-sm shadow-[#DE896A]/30 hover:bg-[#D47A5A] active:bg-[#C26D4D]",
    outline: "border border-[#EEAF9C] bg-white text-[#8A442E] hover:bg-[#FDF7F5]",
    ghost: "text-[#6B5A52] hover:bg-[#FBECE7]",
    subtle: "bg-[#FBECE7] text-[#8A442E] hover:bg-[#F5D1C4]",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
};
const sizeClasses = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-11 px-5 text-sm gap-2",
    icon: "h-9 w-9 justify-center",
};
const Button = forwardRef(({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (_jsx("button", { ref: ref, className: cn("inline-flex items-center rounded-xl font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE896A]/40", variantClasses[variant], sizeClasses[size], className), ...props }));
});
Button.displayName = "Button";
export default Button;
