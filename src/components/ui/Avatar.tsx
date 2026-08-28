import { cn } from "@/lib/utils";

const PALETTE = [
  "bg-[#FBECE7] text-[#C26D4D]",
  "bg-emerald-50 text-emerald-700",
  "bg-sky-50 text-sky-700",
  "bg-violet-50 text-violet-700",
  "bg-amber-50 text-amber-700",
];

function hashIndex(seed: string, mod: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % mod;
}

export function Avatar({ initials, className }: { initials: string; className?: string }) {
  const tone = PALETTE[hashIndex(initials, PALETTE.length)];
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        tone,
        className
      )}
    >
      {initials}
    </div>
  );
}
