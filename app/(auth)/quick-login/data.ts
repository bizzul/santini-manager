import "server-only";

import { createServiceClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";

export type QuickLoginUser = {
  id: number;
  name: string;
  initials: string;
  color: string;
  picture: string | null;
  companyRole: string | null;
};

export type ResolvedSite = {
  id: string;
  organizationId: string | null;
  name: string;
};

export async function resolveSite(domain: string): Promise<ResolvedSite | null> {
  const response = await getSiteData(domain);
  const data = response?.data;
  if (!data) return null;
  return {
    id: data.id,
    organizationId: data.organization_id ?? null,
    name: data.name ?? domain,
  };
}

/**
 * Auth ids belonging to a site: direct site members (user_sites) plus the
 * organization members/admins (user_organizations). Mirrors the membership
 * logic used by fetchCollaborators, but with the service client so it works
 * without an authenticated session (the kiosk is logged out).
 */
async function getSiteMemberAuthIds(
  siteId: string,
  organizationId: string | null,
): Promise<string[]> {
  const supabase = createServiceClient();

  const [siteRes, orgRes] = await Promise.all([
    supabase.from("user_sites").select("user_id").eq("site_id", siteId),
    organizationId
      ? supabase
          .from("user_organizations")
          .select("user_id")
          .eq("organization_id", organizationId)
      : Promise.resolve({ data: [] as { user_id: string }[] }),
  ]);

  const ids = new Set<string>();
  (siteRes.data || []).forEach((r) => r.user_id && ids.add(r.user_id));
  (orgRes.data || []).forEach((r) => r.user_id && ids.add(r.user_id));
  return Array.from(ids);
}

export async function getSiteActiveUsers(
  site: ResolvedSite,
): Promise<QuickLoginUser[]> {
  const authIds = await getSiteMemberAuthIds(site.id, site.organizationId);
  if (!authIds.length) return [];

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("User")
    .select(
      "id, given_name, family_name, initials, color, picture, company_role",
    )
    .in("authId", authIds)
    .eq("enabled", true)
    .neq("role", "superadmin")
    .order("given_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((u) => ({
    id: u.id,
    name: `${u.given_name || ""} ${u.family_name || ""}`.trim() || "Utente",
    initials:
      u.initials ||
      `${u.given_name?.charAt(0) || ""}${u.family_name?.charAt(0) || ""}`
        .toUpperCase() ||
      "??",
    color: u.color || "#6366f1",
    picture: u.picture || null,
    companyRole: u.company_role || null,
  }));
}

/**
 * Returns the user's email only if the user is active and actually belongs to
 * the given site. Used by the login action so a kiosk for one site can never
 * authenticate a user from another site.
 */
export async function getSiteUserEmailForLogin(
  domain: string,
  userId: number,
): Promise<string | null> {
  const site = await resolveSite(domain);
  if (!site) return null;

  const supabase = createServiceClient();
  const { data: user, error } = await supabase
    .from("User")
    .select("email, authId, enabled, role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !user || !user.email || user.enabled === false) return null;
  if (user.role === "superadmin" || !user.authId) return null;

  const authIds = await getSiteMemberAuthIds(site.id, site.organizationId);
  if (!authIds.includes(user.authId)) return null;

  return user.email;
}
