"use client";

import { useEffect } from "react";
import { PageErrorFallback } from "@/components/error-boundary";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console/monitoring service
    logger.error("Root error boundary caught error:", error);
  }, [error]);

  return <PageErrorFallback reset={reset} />;
}

