"use client";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { clearPersistentCache } from "@/lib/cache-utils";

export function LogoutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const logout = async () => {
    // Clear React Query cache (in-memory)
    queryClient.clear();
    // Clear persistent cache (localStorage)
    clearPersistentCache();

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return <Button onClick={logout}>Logout</Button>;
}
