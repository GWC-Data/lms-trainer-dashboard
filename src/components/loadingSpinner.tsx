import React, { useEffect, useState } from "react";

interface LoadingSpinnerProps {
  timeout?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ timeout }) => {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (timeout) {
      const timer = setTimeout(() => {
        setTimedOut(true);
      }, timeout);
      return () => clearTimeout(timer);
    }
  }, [timeout]);

  if (timedOut) return null;

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#DE896A]/20 border-t-[#DE896A]" />
      <span className="text-sm font-medium text-gray-500">Loading schedule...</span>
    </div>
  );
};

export default LoadingSpinner;
