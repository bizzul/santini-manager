"use client";

import { useEffect } from "react";
import { toast } from "@/lib/toast";

/**
 * @deprecated Use `@/lib/toast` or `useToast` from `@/components/ui/use-toast`.
 * Preserves the legacy show/icon/text API via the canonical toast system.
 */
function Toast({
  show,
  text,
}: {
  show: boolean;
  icon?: unknown;
  text: string;
}) {
  useEffect(() => {
    if (show === true && text) {
      toast.success(text);
    }
  }, [show, text]);

  return null;
}

export default Toast;
