"use client";

import { Button } from "@/components/ui/button";
import { VenetianMask } from "lucide-react";

export default function ImpersonateButton({
  userId,
  compact = false,
}: {
  userId: string;
  compact?: boolean;
}) {
  const handleImpersonate = async () => {
    await fetch("/api/auth/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    window.location.reload();
  };

  if (compact) {
    return (
      <Button
        size="sm"
        variant="destructive"
        onClick={handleImpersonate}
        title="Impersonate"
        aria-label="Impersonate"
        className="h-8 w-8 p-0"
      >
        <VenetianMask className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button size="sm" variant="destructive" onClick={handleImpersonate}>
      Impersonate
    </Button>
  );
}
