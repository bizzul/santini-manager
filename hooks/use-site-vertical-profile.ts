"use client";

import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_SITE_VERTICAL_PROFILE,
  resolveSiteVerticalProfile,
  type SiteVerticalProfile,
} from "@/lib/site-verticals";

type SiteDataQueryResult = {
  id: string;
  name: string;
  image: string | null;
  verticalProfile?: unknown;
  organization: { name: string };
};

export function useSiteVerticalProfile(domain?: string | null) {
  return useQuery<SiteVerticalProfile>({
    queryKey: ["site-vertical-profile", domain],
    enabled: !!domain,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async () => {
      if (!domain) {
        return DEFAULT_SITE_VERTICAL_PROFILE;
      }

      const response = await fetch(`/api/sites/${domain}`);
      if (!response.ok) {
        return DEFAULT_SITE_VERTICAL_PROFILE;
      }

      const data = (await response.json()) as SiteDataQueryResult;
      return resolveSiteVerticalProfile(data.verticalProfile);
    },
    initialData: () => {
      if (typeof window === "undefined" || !domain) {
        return DEFAULT_SITE_VERTICAL_PROFILE;
      }

      return DEFAULT_SITE_VERTICAL_PROFILE;
    },
  });
}
