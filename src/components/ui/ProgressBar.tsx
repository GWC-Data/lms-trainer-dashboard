import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
}

export function ProgressBar({ value, className, trackClassName, barClassName }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-[#F5E2DA]", trackClassName, className)}>
      <div
        className={cn("h-full rounded-full bg-[#DE896A] transition-all duration-500", barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

interface RadialProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export function RadialProgress({ value, size = 96, strokeWidth = 8, label, sublabel }: RadialProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="white"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && <span className="text-3xl font-bold text-white leading-none">{label}</span>}
        {sublabel && <span className="mt-1 text-[10px] text-white/80">{sublabel}</span>}
      </div>
    </div>
  );
}
