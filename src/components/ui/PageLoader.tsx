import React from "react";
import faviconImg from "@/assets/favicon.png";
import { cn } from "@/lib/utils";

export interface PageLoaderProps {
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  text = "Loading...",
  className,
  fullScreen = false,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={text || "Loading"}
      className={cn(
        "flex flex-col items-center justify-center w-full",
        fullScreen
          ? "fixed inset-0 z-50 bg-[#FFF8F6]/95 backdrop-blur-[2px]"
          : "min-h-[60vh] sm:min-h-[70vh] py-16",
        className
      )}
    >
      <div className="flex items-center justify-center">
        {/* Large bouncing TeqCertify brand icon */}
        <img
          src={faviconImg}
          alt="TeqCertify"
          className="h-20 w-20 sm:h-24 sm:w-24 object-contain animate-bounce select-none drop-shadow-sm"
        />
      </div>

      {text && (
        <p className="mt-4 text-xs sm:text-sm font-medium text-[#8C7A70] tracking-normal select-none">
          {text}
        </p>
      )}
      <span className="sr-only">{text || "Loading..."}</span>
    </div>
  );
};

export default PageLoader;

