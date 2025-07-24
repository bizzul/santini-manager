"use client";

import { Button } from "@/components/ui/button";

export default function ImpersonateButton({ userId }: { userId: string }) {
  const handleImpersonate = async () => {
    await fetch("/api/auth/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    window.location.reload();
  };
  return (
    <Button size="sm" variant="destructive" onClick={handleImpersonate}>
      Impersonate
    </Button>
  );
}
