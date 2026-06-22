"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { clearPersistentCache } from "@/lib/cache-utils";
import { createClient } from "@/utils/supabase/client";

const QUICK_LOGIN_COOKIE = "ql-domain";

function readQuickLoginDomain(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${QUICK_LOGIN_COOKIE}=`));
  if (!match) return null;
  const value = decodeURIComponent(match.split("=")[1] || "");
  return value || null;
}

function clearQuickLoginCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${QUICK_LOGIN_COOKIE}=; path=/; max-age=0`;
}

/**
 * Hook for handling logout with proper cache cleanup.
 * Clears both in-memory React Query cache and persistent localStorage cache.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const logout = useCallback(async () => {
    // If this session was started from a site quick-login kiosk, send the user
    // back to that site's quick-login screen instead of the generic login.
    const quickLoginDomain = readQuickLoginDomain();

    // Clear React Query cache (in-memory)
    queryClient.clear();
    // Clear persistent cache (localStorage)
    clearPersistentCache();

    // Sign out from Supabase
    const supabase = createClient();
    await supabase.auth.signOut();

    if (quickLoginDomain) {
      clearQuickLoginCookie();
      router.push(`/quick-login/${quickLoginDomain}`);
    } else {
      router.push("/login");
    }
  }, [queryClient, router]);

  return { logout };
}
