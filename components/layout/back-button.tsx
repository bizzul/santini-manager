"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  domain: string;
  /** Fallback when there is no browser history (direct link). */
  fallbackHref?: string;
  className?: string;
}

/**
 * Navigates to the previous screen via `router.back()`, falling back to the
 * site home when history is empty.
 */
export function BackButton({
  domain,
  fallbackHref,
  className,
}: BackButtonProps) {
  const router = useRouter();
  const fallback = fallbackHref ?? `/sites/${domain}/home`;

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallback);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleBack}
      className={cn("shrink-0", className)}
    >
      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
      Indietro
    </Button>
  );
}
