import React from "react";
import faviconImg from "@/assets/favicon.png";
import { cn } from "@/lib/utils";

export interface PageLoaderProps {
  text?: string;
  className?: string;
  imageClassName?: string;
  size?: "sm" | "md" | "lg" | "xl";
  fullScreen?: boolean;
}

const sizeClasses: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "h-10 w-10 sm:h-12 sm:w-12",
  md: "h-14 w-14 sm:h-16 sm:w-16",
  lg: "h-20 w-20 sm:h-24 sm:w-24",
  xl: "h-24 w-24 sm:h-28 sm:w-28",
};

export const PageLoader: React.FC<PageLoaderProps> = ({
  className,
  imageClassName,
  size = "lg",
  fullScreen = false,
}) => {
  const isCustomHeight = Boolean(
    className && (className.includes("min-h-") || className.includes("h-"))
  );

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className={cn(
        "flex flex-col items-center justify-center w-full",
        fullScreen
          ? "fixed inset-0 z-50 bg-[#FFF8F6]/95 backdrop-blur-[2px]"
          : isCustomHeight
          ? ""
          : "min-h-full h-full flex-1",
        className
      )}
    >
      <div className="flex items-center justify-center animate-teqcertify-glow">
        {/* Smoothly rotating TeqCertify brand icon with soft pulsing glow */}
        <img
          src={faviconImg}
          alt="Loading"
          className={cn(
            sizeClasses[size] || sizeClasses.md,
            "object-contain animate-spin-slow select-none pointer-events-none",
            imageClassName
          )}
        />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
};

export default PageLoader;

