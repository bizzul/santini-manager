import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";

// Force dynamic rendering to prevent static generation errors with cookies
export const dynamic = "force-dynamic";

async function ImpersonationBanner({
  impersonatedUser,
  originalSuperadminId,
}: {
  impersonatedUser: any;
  originalSuperadminId: string;
}) {
  const handleLeave = async () => {
    await fetch("/api/auth/stop-impersonation", { method: "POST" });
    window.location.reload();
  };
  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-yellow-200 text-yellow-900 flex items-center justify-center py-3 shadow-sm">
      <span className="font-semibold mr-4">
        You are impersonating: {impersonatedUser?.email || impersonatedUser?.id}
      </span>
      <Button variant="destructive" size="sm" onClick={handleLeave}>
        Leave impersonation
      </Button>
    </div>
  );
}

export default async function AdministrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userContext = await getUserContext();
  const isImpersonating = userContext?.isImpersonating;
  const impersonatedUser = userContext?.impersonatedUser;
  const originalSuperadminId = userContext?.originalSuperadminId;

  let user = userContext?.user;
  let role = userContext?.role;

  return (
    <div className="administration-layout pb-16">
      {isImpersonating && impersonatedUser && originalSuperadminId && (
        <ImpersonationBanner
          impersonatedUser={impersonatedUser}
          originalSuperadminId={originalSuperadminId}
        />
      )}
      <div className="relative top-0 left-0 z-40 bg-white/90 rounded-sm shadow-sm px-4 py-2 text-sm text-gray-800 border border-gray-200 mt-0">
        {user ? (
          <span>
            <strong>User:</strong> {user.email} <span className="mx-2">|</span>{" "}
            <strong>Role:</strong> {role || "Unknown"}
            <span className="mx-2">|</span>
            <Link href="/logout">
              <Button variant="outline">Logout</Button>
            </Link>
          </span>
        ) : (
          <span>Not logged in</span>
        )}
      </div>
      {children}
    </div>
  );
}
