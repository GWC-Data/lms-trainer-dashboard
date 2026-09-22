import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-between pt-1 relative items-center px-1",
        caption_label: "text-sm font-semibold text-[#3A2A22]",
        nav: "space-x-1 flex items-center",
        nav_button:
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-[#FBECE7] rounded-lg transition-colors flex items-center justify-center text-[#3A2A22]",
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse space-y-1",
        head_row: "flex justify-between",
        head_cell: "text-[#8C7A70] rounded-md w-9 font-medium text-[0.8rem] text-center",
        row: "flex w-full mt-2 justify-between",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-[#FBECE7]/50 [&:has([aria-selected])]:bg-[#FBECE7] first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: "h-9 w-9 p-0 font-medium text-xs rounded-xl hover:bg-[#FBECE7] hover:text-[#DE896A] transition-colors aria-selected:opacity-100 flex items-center justify-center text-[#3A2A22]",
        day_range_end: "day-range-end",
        day_selected:
          "!bg-[#DE896A] !text-white hover:!bg-[#DE896A] hover:!text-white focus:!bg-[#DE896A] focus:!text-white font-semibold shadow-sm",
        day_today: "border border-[#DE896A] text-[#DE896A] font-bold",
        day_outside:
          "day-outside text-[#C7B6AC] opacity-50 aria-selected:bg-[#FBECE7]/50 aria-selected:text-[#DE896A] aria-selected:opacity-30",
        day_disabled: "text-[#C7B6AC] opacity-35 hover:bg-transparent cursor-not-allowed hover:text-[#C7B6AC]",
        day_range_middle:
          "aria-selected:bg-[#FBECE7] aria-selected:text-[#DE896A]",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
