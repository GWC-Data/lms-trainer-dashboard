import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  chipBg: string;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  chipBg,
}: StatCardProps) {
  return (
    <Card className="w-full min-w-0 max-w-full box-border group relative overflow-hidden rounded-xl sm:rounded-2xl border border-[#F0DED4] bg-white p-3.5 sm:p-4 bento-card shadow-xs">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#A49288] truncate">
            {label}
          </p>
          <p className="text-xl sm:text-2xl font-extrabold text-[#2E1F18] tracking-tight leading-tight">
            {value}
          </p>
        </div>
        <div
          className={`flex h-9 w-9 sm:h-9.5 sm:w-9.5 shrink-0 items-center justify-center rounded-xl ${chipBg} shadow-2xs group-hover:scale-105 transition-transform duration-200`}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
    </Card>
  );
}
