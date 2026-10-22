"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { markPendingTabAuthChange } from "@/utils/supabase/tab-auth-storage";

/**
 * Logout navigates this tab on purpose. The marker tells the next page load
 * to adopt the cleared cookies instead of restoring the previous user.
 */
export function LogoutLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href="/logout"
      className={className}
      onClick={() => markPendingTabAuthChange(window.sessionStorage)}
    >
      {children}
    </Link>
  );
}
