import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ className, label, error, id, name, rows = 3, ...props }, ref) => {
    const inputId = id ?? (typeof name === "string" ? name : undefined);

    const textareaElement = (
      <textarea
        ref={ref}
        id={inputId}
        name={name}
        rows={rows}
        className={cn(
          "w-full resize-none rounded-xl border border-[#F0DED4] bg-white px-3 py-2 text-xs font-medium text-[#233047] placeholder:text-[#B7A79D] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          error && "border-red-300 focus:border-red-400 focus:ring-red-200",
          className
        )}
        {...props}
      />
    );

    if (label || error) {
      return (
        <div className="space-y-1 w-full">
          {label && (
            <label htmlFor={inputId} className="text-xs font-medium text-[#6B5A52]">
              {label}
            </label>
          )}
          {textareaElement}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      );
    }

    return textareaElement;
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
export default Textarea;
