"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TopBar({ user }: { user: any }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleLogout = () => {
    window.location.href = "/logout";
  };

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const topBarClasses =
    "w-full h-16 bg-white/10 backdrop-blur-md border-b border-white/20 flex items-center justify-between px-6";

  if (loading) {
    return (
      <div className={topBarClasses}>
        <div className="w-24 h-8 bg-white/20 rounded animate-pulse" />
        <div className="w-24 h-8 bg-white/20 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={topBarClasses}>
      <Link
        href="/"
        className="text-xl font-semibold text-white hover:text-white/80 transition-colors"
      >
        matris.pro
      </Link>

      <nav className="flex items-center gap-3">
        {user ? (
          <>
            {isAdmin && (
              <Link href="/administration">
                <Button
                  variant="outline"
                  className="hover:bg-white/20 text-white border-white/30"
                >
                  Admin
                </Button>
              </Link>
            )}
            <Link href="/sites/select">
              <Button
                variant="outline"
                className="hover:bg-white/20 text-white border-white/30"
              >
                Manager
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
          <Link href="/login">
            <Button
              variant="outline"
              className="hover:bg-white/20 text-white border-white/30"
            >
              Login
            </Button>
          </Link>
        )}
      </nav>
    </div>
  );
}
