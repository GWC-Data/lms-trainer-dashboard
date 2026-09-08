import React from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-[#F0EAE6]/70", className)}
      {...props}
    />
  );
}

export { Skeleton };
