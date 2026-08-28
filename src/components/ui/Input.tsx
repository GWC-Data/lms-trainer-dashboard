import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ className, label, error, id, name, ...props }, ref) => {
    const inputId = id ?? (typeof name === "string" ? name : undefined);
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[#6B5A52]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          name={name}
          className={cn(
            "h-10 w-full rounded-xl border border-[#F0DED4] bg-white px-3 text-sm text-[#3A2A22] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20",
            error && "border-red-300 focus:border-red-400 focus:ring-red-200",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export default Input;
