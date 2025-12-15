"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { UserContext } from "@/lib/auth-utils";
import { validateCacheForUser } from "@/lib/cache-utils";

interface SiteDataForHydration {
  name: string;
  image: string | null;
  organization: { name: string };
}

interface HydrationData {
  userContext?: UserContext | null;
  siteData?: SiteDataForHydration;
  domain?: string;
}

/**
 * Component that hydrates React Query cache with server-side data.
 * This prevents duplicate API calls by pre-populating the cache with
 * data that was already fetched on the server.
 *
 * Also validates that the persistent cache belongs to the current user,
 * clearing it if a different user logs in.
 *
 * Only hydrates once on initial render to avoid overwriting fresh data
 * that might have been updated via realtime subscriptions.
 */
export function QueryHydration({ data }: { data: HydrationData }) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  // Hydrate only once on initial mount (before any effects run)
  // This uses a ref instead of useEffect to hydrate synchronously
  // before the first render, preventing flash of loading state
  if (!hydrated.current && typeof window !== "undefined") {
    hydrated.current = true;

    // Validate that persistent cache belongs to current user
    // If user changed, this clears the cache automatically
    if (data.userContext?.userId) {
      const cacheValid = validateCacheForUser(data.userContext.userId);
      if (!cacheValid) {
        // Cache was cleared because user changed, clear in-memory cache too
        queryClient.clear();
      }
    }

    if (data.userContext) {
      // Only set if cache is empty to avoid overwriting fresh data
      const existingUserContext = queryClient.getQueryData(["user-context"]);
      if (!existingUserContext) {
        queryClient.setQueryData(["user-context"], data.userContext);
      }
    }

    if (data.siteData && data.domain) {
      // Only set if cache is empty to avoid overwriting fresh data
      const existingSiteData = queryClient.getQueryData([
        "site-data",
        data.domain,
      ]);
      if (!existingSiteData) {
        queryClient.setQueryData(["site-data", data.domain], data.siteData);
      }
    }
  }

  return null;
}
