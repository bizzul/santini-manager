import { getUserContext, getUserSites } from "@/lib/auth-utils";
import { SitesGridClient } from "@/components/sites-select/sites-grid-client";
import { createClient } from "@/utils/supabase/server";

type SiteGroupKey = "active" | "custom" | "beta" | "alpha";

const isSiteGroupKey = (value: unknown): value is SiteGroupKey =>
  value === "active" || value === "custom" || value === "beta" || value === "alpha";

async function getSiteGroupOverrides(userId: string, siteIds: string[]) {
  if (!userId || siteIds.length === 0) {
    return {} as Record<string, SiteGroupKey>;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_site_select_preferences")
    .select("site_id, group_key")
    .eq("user_id", userId)
    .in("site_id", siteIds);
  if (error) {
    // Keep the page usable even if migration is not applied yet.
    return {} as Record<string, SiteGroupKey>;
  }

  const overrides: Record<string, SiteGroupKey> = {};
  (data || []).forEach((entry) => {
    if (isSiteGroupKey(entry.group_key)) {
      overrides[String(entry.site_id)] = entry.group_key;
    }
  });

  return overrides;
}

export async function SitesGrid() {
  const userContext = await getUserContext();
  const isSuperadmin = userContext?.role === "superadmin";
  const userId = userContext?.userId || userContext?.user?.id;
  const sites = await getUserSites();

  if (!sites?.length) {
    return (
      <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-12 text-center">
        <p className="text-white/70 text-lg">
          Nessuno spazio assegnato al tuo account
        </p>
      </div>
    );
  }

  const siteIds = sites
    .map((site: any) => String(site.id))
    .filter((siteId: string) => Boolean(siteId));
  const initialOverrides =
    isSuperadmin && userId ? await getSiteGroupOverrides(userId, siteIds) : {};

  return (
    <SitesGridClient
      sites={sites}
      initialOverrides={initialOverrides}
      canManageGroups={isSuperadmin}
    />
  );
}

export function SitesGridSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-4">
      {[1, 2, 3, 4].map((column) => (
        <div
          key={column}
          className="rounded-3xl border border-white/15 bg-white/5 p-4"
        >
          <div className="mb-4 space-y-2 border-b border-white/10 pb-4">
            <div className="h-6 w-32 animate-pulse rounded bg-white/15" />
            <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
          </div>
          <div className="space-y-4">
            {[1, 2].map((card) => (
              <div
                key={card}
                className="rounded-2xl border border-white/15 bg-white/6 p-5"
              >
                <div className="flex gap-3">
                  <div className="h-12 w-12 animate-pulse rounded-xl bg-white/15" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-32 animate-pulse rounded bg-white/15" />
                    <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
                  </div>
                </div>
                <div className="mt-4 h-4 w-full animate-pulse rounded bg-white/10" />
                <div className="mt-4 h-10 w-full animate-pulse rounded bg-white/15" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

