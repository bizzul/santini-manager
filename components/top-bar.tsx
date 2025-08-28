"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TopBar({ user }: { user: any }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(false);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      // Use a simple redirect instead of Supabase client-side logout
      // The server-side auth will handle the session cleanup
      window.location.href = "/logout";
    } catch (error) {
      console.error("Error during logout:", error);
      // Fallback to direct redirect
      window.location.href = "/logout";
    }
  };

  if (loading) {
    return (
      <div className="w-full h-16 bg-white/10 backdrop-blur-md border-b border-white/20 flex items-center justify-between px-6">
        <div className="w-20 h-6 bg-white/20 rounded animate-pulse" />
        <div className="w-24 h-8 bg-white/20 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full h-16 bg-white/10 backdrop-blur-md border-b border-white/20 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <Link
          href="/"
          className="text-xl font-semibold text-white hover:text-white/80 transition-colors"
        >
          Matris Manager
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        {user ? (
          <>
            {user.role === "admin" ||
              (user.role === "superadmin" && (
                <Link href="/administration">
                  <Button
                    variant="outline"
                    className="hover:bg-white/20 text-white border-white/30"
                  >
                    Go to administration
                  </Button>
                </Link>
              ))}
            <Link href="/sites/select">
              <Button
                variant="outline"
                className="hover:bg-white/20 text-white border-white/30"
              >
                Go to your sites
              </Button>
            </Link>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-white hover:bg-white/20 hover:text-white"
            >
              Logout
            </Button>
          </>
        ) : (
          <>
            <Link href="/login">
              <Button
                variant="outline"
                className="hover:bg-white/20 text-white border-white/30"
              >
                Login
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
