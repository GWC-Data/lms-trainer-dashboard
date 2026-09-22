import React, { useEffect, useState } from "react";
import PageLoader from "./ui/PageLoader";

interface LoadingSpinnerProps {
  timeout?: number;
  text?: string;
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

  return <PageLoader />;
};

export default LoadingSpinner;

