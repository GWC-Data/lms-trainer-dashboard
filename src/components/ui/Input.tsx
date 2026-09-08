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

    const inputElement = (
      <input
        ref={ref}
        id={inputId}
        name={name}
        className={cn(
          "flex h-10 w-full rounded-xl border border-[#F0DED4] bg-white px-3 py-2 text-xs font-medium text-[#233047] placeholder:text-[#B7A79D] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
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
          {inputElement}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      );
    }

    return inputElement;
  }
);
Input.displayName = "Input";

export { Input };
export default Input;
