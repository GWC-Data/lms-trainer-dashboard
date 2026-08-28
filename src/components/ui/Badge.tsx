import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "orange" | "green" | "red" | "amber" | "blue" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  orange: "bg-[#FBECE7] text-[#C26D4D] border-[#F5D1C4]",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-red-50 text-red-600 border-red-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  blue: "bg-sky-50 text-sky-700 border-sky-200",
  neutral: "bg-[#F6F1EE] text-[#6B5A52] border-[#EAE0DA]",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
