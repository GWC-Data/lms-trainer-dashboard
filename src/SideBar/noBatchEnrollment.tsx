import React from "react";
import { CalendarX } from "lucide-react";

const NoBatchEnrollment: React.FC = () => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 rounded-full bg-orange-50 p-4 text-[#DE896A]">
        <CalendarX className="h-12 w-12" />
      </div>
      <h2 className="text-xl font-bold text-gray-800">No Active Batch Enrollment</h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        You are not currently enrolled in any active batch. Schedule, classes, and batch events will appear here once you are assigned to a batch.
      </p>
    </div>
  );
};

export default NoBatchEnrollment;
