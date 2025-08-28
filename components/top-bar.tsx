"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

export default function TopBar({ user }: { user: any }) {
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Redirect to home page after logout
      window.location.href = "/";
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(false);
    }
  }, [user]);

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
