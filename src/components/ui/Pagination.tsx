import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
  onPageChange: (newPage: number) => void;
  loading?: boolean;
  itemLabel?: string;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  total,
  limit,
  hasPreviousPage,
  hasNextPage,
  onPageChange,
  loading = false,
  itemLabel = "items",
  className = "",
}) => {
  if (total <= 0) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, total);
  const isPrevDisabled = loading || (hasPreviousPage !== undefined ? !hasPreviousPage : page <= 1);
  const isNextDisabled = loading || (hasNextPage !== undefined ? !hasNextPage : page >= safeTotalPages);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 rounded-2xl border border-[#F0DED4] bg-white shadow-xs ${className}`}
    >
      <p className="text-xs text-[#8C7A70]">
        Showing <span className="font-semibold text-[#3A2A22]">{startItem}</span> to{" "}
        <span className="font-semibold text-[#3A2A22]">{endItem}</span> of{" "}
        <span className="font-semibold text-[#3A2A22]">{total}</span> {itemLabel}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={isPrevDisabled}
          className="h-8 px-2.5 text-xs text-[#3A2A22] border-[#F0DED4] hover:bg-[#FFFBF9]"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <span className="text-xs font-medium text-[#3A2A22] px-2">
          Page {page} of {safeTotalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
          disabled={isNextDisabled}
          className="h-8 px-2.5 text-xs text-[#3A2A22] border-[#F0DED4] hover:bg-[#FFFBF9]"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
