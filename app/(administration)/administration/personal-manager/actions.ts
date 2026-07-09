"use server";

import { getUserContext } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";
import { createServiceClient } from "@/utils/supabase/server";
import {
  AREA_SLUGS,
  type AreaSlug,
  type PermissionsMatrix,
} from "@/lib/personal-manager/types";

export interface SiteOption {
  id: string;
  name: string;
  subdomain: string | null;
  organization_id: string | null;
}

export interface SiteUserOption {
  userId: string;
  email: string;
  role: string | null;
}

export interface BetaAccessState {
  beta_app_enabled: boolean;
  areas_visible: AreaSlug[];
  permissions: PermissionsMatrix;
}

/** Verifica che l'utente corrente possa gestire il sito indicato. */
async function assertCanManageSite(siteId: string) {
  const context = await getUserContext();
  if (!context || !isAdminOrSuperadmin(context.role)) {
    throw new Error("Non autorizzato");
  }
  if (context.role === "superadmin") return context;

  // Admin: il sito deve appartenere a una sua organizzazione.
  const service = createServiceClient();
  const { data: site } = await service
    .from("sites")
    .select("organization_id")
    .eq("id", siteId)
    .maybeSingle();
  if (
    !site?.organization_id ||
    !context.organizationIds?.includes(site.organization_id)
  ) {
    throw new Error("Non autorizzato per questo spazio");
  }
  return context;
}

/** Utenti associati a un sito (via user_sites e user_organizations). */
export async function getSiteUsers(siteId: string): Promise<SiteUserOption[]> {
  await assertCanManageSite(siteId);
  const service = createServiceClient();

  const { data: site } = await service
    .from("sites")
    .select("organization_id")
    .eq("id", siteId)
    .maybeSingle();

  const [siteLinks, orgLinks] = await Promise.all([
    service.from("user_sites").select("user_id").eq("site_id", siteId),
    site?.organization_id
      ? service
          .from("user_organizations")
          .select("user_id")
          .eq("organization_id", site.organization_id)
      : Promise.resolve({ data: [] as { user_id: string }[] }),
  ]);

  const ids = new Set<string>();
  (siteLinks.data ?? []).forEach((r) => ids.add(r.user_id));
  (orgLinks.data ?? []).forEach((r) => ids.add(r.user_id));
  if (ids.size === 0) return [];

  const { data: users } = await service
    .from("User")
    .select("authId, email, role")
    .in("authId", Array.from(ids));

  return (users ?? [])
    .filter((u) => u.authId)
    .map((u) => ({
      userId: u.authId as string,
      email: u.email ?? "(senza email)",
      role: u.role ?? null,
    }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

/** Stato accesso Beta corrente per un utente su un sito. */
export async function getBetaAccess(
  siteId: string,
  userId: string,
): Promise<BetaAccessState> {
  await assertCanManageSite(siteId);
  const service = createServiceClient();
  const { data } = await service
    .from("pm_access")
    .select("beta_app_enabled, areas_visible, permissions")
    .eq("site_id", siteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return { beta_app_enabled: false, areas_visible: [], permissions: {} };
  }
  return {
    beta_app_enabled: data.beta_app_enabled,
    areas_visible: (data.areas_visible ?? []) as AreaSlug[],
    permissions: (data.permissions ?? {}) as PermissionsMatrix,
  };
}

/** Salva (upsert) l'accesso Beta e la matrice permessi. */
export async function saveBetaAccess(
  siteId: string,
  userId: string,
  state: BetaAccessState,
): Promise<{ ok: true }> {
  await assertCanManageSite(siteId);

  // Sanitizza: solo slug noti; permessi coerenti con le aree visibili.
  const areas = state.areas_visible.filter((s): s is AreaSlug =>
    AREA_SLUGS.includes(s as AreaSlug),
  );
  const permissions: PermissionsMatrix = {};
  for (const slug of areas) {
    const p = state.permissions[slug];
    permissions[slug] = {
      read: p?.read ?? true,
      edit: p?.edit ?? false,
      create: p?.create ?? false,
    };
  }

  const service = createServiceClient();
  const { error } = await service.from("pm_access").upsert(
    {
      site_id: siteId,
      user_id: userId,
      beta_app_enabled: state.beta_app_enabled,
      areas_visible: areas,
      permissions,
    },
    { onConflict: "site_id,user_id" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}
