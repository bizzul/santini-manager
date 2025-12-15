"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { clearPersistentCache } from "@/lib/cache-utils";
import { createClient } from "@/utils/supabase/client";

/**
 * Hook for handling logout with proper cache cleanup.
 * Clears both in-memory React Query cache and persistent localStorage cache.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const logout = useCallback(async () => {
    // Clear React Query cache (in-memory)
    queryClient.clear();
    // Clear persistent cache (localStorage)
    clearPersistentCache();

    // Sign out from Supabase
    const supabase = createClient();
    await supabase.auth.signOut();

    // Navigate to login
    router.push("/login");
  }, [queryClient, router]);

  return { logout };
}
