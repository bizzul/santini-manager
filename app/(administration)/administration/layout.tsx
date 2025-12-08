import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";
import Image from "next/image";
import { Home, LogOut, Settings } from "lucide-react";

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
    <div className="fixed top-0 left-0 w-full z-50 backdrop-blur-xl bg-yellow-500/20 border-b border-yellow-400/50 text-white flex items-center justify-center py-3 shadow-lg">
      <span className="font-semibold mr-4">
        You are impersonating: {impersonatedUser?.email || impersonatedUser?.id}
      </span>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleLeave}
        className="border-2 border-red-400/50 text-white hover:bg-red-500/30 hover:border-red-400"
      >
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
    <div className="relative min-h-screen overflow-hidden">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950" />

      {isImpersonating && impersonatedUser && originalSuperadminId && (
        <ImpersonationBanner
          impersonatedUser={impersonatedUser}
          originalSuperadminId={originalSuperadminId}
        />
      )}

      {/* Top Bar */}
      <div className="relative z-20 backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-white/20 hover:scale-105 transition-all duration-300"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
              <Link href="/sites/select">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-white/20 hover:scale-105 transition-all duration-300"
                >
                  I miei spazi
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <span>{user.email}</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/20 border border-white/30">
                    {role}
                  </span>
                </div>
              )}

              <Link href="/logout">
                <Button
                  variant="outline"
                  className="border-2 border-white/40 text-white hover:bg-red-500/30 hover:border-red-400 hover:scale-105 shadow-lg hover:shadow-2xl transition-all duration-300 font-semibold"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`relative z-10 ${isImpersonating ? "pt-12" : ""}`}>
        {children}
      </div>
    </div>
  );
}
