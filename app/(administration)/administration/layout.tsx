import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";
import Image from "next/image";
import { Home, LogOut, Settings } from "lucide-react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { isManagerOfManagersEnabled } from "@/lib/manager-projects/flag";

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

  const user = userContext?.user;
  const role = userContext?.role;

  // Nuova shell "Manager dei Manager": solo superadmin e solo con flag
  // attivo. Con flag spento (o per gli admin di org) il layout storico
  // sottostante resta identico.
  if (isManagerOfManagersEnabled() && role === "superadmin") {
    return (
      <div className="dark relative min-h-screen bg-page text-foreground">
        {isImpersonating && impersonatedUser && originalSuperadminId && (
          <ImpersonationBanner
            impersonatedUser={impersonatedUser}
            originalSuperadminId={originalSuperadminId}
          />
        )}
        <SidebarProvider>
          <AdminSidebar isSuperadmin />
          <SidebarInset className="bg-page">
            <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/60 bg-page/80 px-4 py-2.5 backdrop-blur">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <Link href="/sites/select">
                  <Button variant="ghost" size="sm">
                    <Home className="mr-2 h-4 w-4" />
                    I miei spazi
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-3">
                {user && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="hidden sm:inline">{user.email}</span>
                    <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium">
                      {role}
                    </span>
                  </div>
                )}
                <Link href="/logout">
                  <Button variant="outline" size="sm">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </Link>
              </div>
            </header>
            <div className={isImpersonating ? "pt-12" : ""}>{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    );
  }

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
