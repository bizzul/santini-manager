"use client";

import { useEffect } from "react";
import { pushSupportError } from "@/lib/support/error-buffer";

export function SupportErrorBuffer() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      pushSupportError({
        message: event.message,
        stack: event.error instanceof Error ? event.error.stack : undefined,
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      pushSupportError({
        message:
          reason instanceof Error
            ? reason.message
            : typeof reason === "string"
              ? reason
              : "Unhandled rejection",
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
