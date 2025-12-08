"use client";

import { useEffect } from "react";
import { PageErrorFallback } from "@/components/error-boundary";
import { logger } from "@/lib/logger";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error with site context
    logger.error("Site page error:", error);
  }, [error]);

  return <PageErrorFallback reset={reset} />;
}

