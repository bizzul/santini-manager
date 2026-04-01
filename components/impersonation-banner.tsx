"use client";

import { useState } from "react";

export function ImpersonationBanner({
  impersonatedUser,
}: {
  impersonatedUser: { email?: string; id?: string } | null | undefined;
  originalSuperadminId?: string;
}) {
  const [isLeaving, setIsLeaving] = useState(false);

  const handleLeave = async () => {
    try {
      setIsLeaving(true);
      await fetch("/api/auth/stop-impersonation", { method: "POST" });
      window.location.reload();
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 z-50 flex w-full items-center justify-center bg-yellow-200 py-3 text-yellow-900 shadow-sm">
      <span className="mr-4 font-semibold">
        You are impersonating: {impersonatedUser?.email || impersonatedUser?.id}
      </span>
      <button
        className="rounded-sm bg-red-600 px-3 py-1 text-white disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isLeaving}
        onClick={handleLeave}
      >
        {isLeaving ? "Leaving..." : "Leave impersonation"}
      </button>
    </div>
  );
}
