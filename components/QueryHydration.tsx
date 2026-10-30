"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { UserContext } from "@/lib/auth-utils";
import { validateCacheForUser } from "@/lib/cache-utils";

interface SiteDataForHydration {
  id: string;
  name: string;
  image: string | null;
  logo?: string | null;
  organization: { name: string };
  verticalProfile?: unknown;
  /** When `true`, the Command Deck page and launcher are available. */
  commandDeckEnabled?: boolean;
  /** When `true`, the technical support widget is available. */
  supportBotEnabled?: boolean;
  /** Per-site interface locale, resolved on the server. */
  siteLocale?: unknown;
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
  const router = useRouter();
  const hydrated = useRef(false);
  const autocorrectedRef = useRef(false);

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
      const existingSiteData = queryClient.getQueryData<SiteDataForHydration>([
        "site-data",
        data.domain,
      ]);
      if (!existingSiteData) {
        queryClient.setQueryData(["site-data", data.domain], data.siteData);
      } else if (
        existingSiteData.commandDeckEnabled === undefined ||
        existingSiteData.supportBotEnabled === undefined
      ) {
        queryClient.setQueryData(["site-data", data.domain], {
          ...existingSiteData,
          commandDeckEnabled: data.siteData.commandDeckEnabled,
          supportBotEnabled: data.siteData.supportBotEnabled,
        });
      }
    }
  }

  // After mount, self-correct an SSR identity flash. On a shared PC every window
  // of the origin shares the cookie jar, so the server may have rendered as a
  // different operaio than the one who owns THIS tab. getSession() reads the
  // per-tab session (sessionStorage), which is the real identity of this window.
  // When it disagrees with the SSR-rendered user, we trust the tab token: drop
  // the stale user-context (client consumers refetch it with the Bearer token)
  // and re-render the server tree once with this tab's (already republished)
  // cookie. Impersonation deliberately uses a shared cookie, so it is exempt.
  const ssrUserId: string | null = data.userContext?.user?.id ?? null;
  const isImpersonating = Boolean(data.userContext?.isImpersonating);

  useEffect(() => {
    if (autocorrectedRef.current) return;
    if (isImpersonating || !ssrUserId) return;

    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const tabUserId = sessionData.session?.user?.id ?? null;
        // Only act when both identities are known and genuinely differ.
        if (cancelled || !tabUserId || tabUserId === ssrUserId) return;

        autocorrectedRef.current = true; // guard: refresh at most once per mount
        queryClient.removeQueries({ queryKey: ["user-context"] });
        router.refresh();
      } catch {
        // Non-fatal: leave the existing SSR/cookie behaviour untouched.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ssrUserId, isImpersonating, queryClient, router]);

  return null;
}
