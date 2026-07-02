"use client";

import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_LOCALE,
  resolveSiteLocale,
  type AppLocale,
} from "@/lib/i18n/config";

type SiteDataQueryResult = {
  id: string;
  name: string;
  siteLocale?: unknown;
};

/**
 * Client hook that resolves the per-site locale from the shared
 * `/api/sites/[domain]` payload. Mirrors `useSiteVerticalProfile` and
 * reuses the same React Query cache key (`site-data`) that the layout
 * hydrates, so it usually resolves without an extra request.
 */
export function useSiteLocale(domain?: string | null): AppLocale {
  const { data } = useQuery<AppLocale>({
    queryKey: ["site-locale", domain],
    enabled: !!domain,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async () => {
      if (!domain) return DEFAULT_LOCALE;
      const response = await fetch(`/api/sites/${domain}`);
      if (!response.ok) return DEFAULT_LOCALE;
      const payload = (await response.json()) as SiteDataQueryResult;
      return resolveSiteLocale(payload.siteLocale);
    },
  });

  return data ?? DEFAULT_LOCALE;
}
