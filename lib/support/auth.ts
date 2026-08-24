import { getUserContext, getUserSites } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { getSupportBotEnabledForSite } from "@/lib/support/settings.server";
import type { UserContext } from "@/lib/auth-utils";

export type SupportAuthOk = {
  ok: true;
  userContext: UserContext;
  userId: string;
  siteId: string;
  domain: string;
  organizationId: string | null;
  isSuperadmin: boolean;
  isSiteAdmin: boolean;
  supportEnabled: boolean;
};

export type SupportAuthErr = {
  ok: false;
  status: number;
  error: string;
};

export async function requireSupportSiteAccess(
  domain: string,
  options?: { requireEnabled?: boolean },
): Promise<SupportAuthOk | SupportAuthErr> {
  const userContext = await getUserContext();
  if (!userContext?.userId) {
    return { ok: false, status: 401, error: "Non autenticato" };
  }

  const siteResult = await getSiteData(domain);
  const site = siteResult?.data;
  if (!site?.id) {
    return { ok: false, status: 404, error: "Spazio non trovato" };
  }

  const isSuperadmin = userContext.role === "superadmin";
  if (!isSuperadmin) {
    const accessible = await getUserSites();
    const hasAccess = accessible.some((s) => s.id === site.id);
    if (!hasAccess) {
      return { ok: false, status: 403, error: "Accesso allo Spazio negato" };
    }
  }

  const supportEnabled = await getSupportBotEnabledForSite(site.id);
  if (options?.requireEnabled && !supportEnabled && !isSuperadmin) {
    return { ok: false, status: 404, error: "Supporto non attivo su questo Spazio" };
  }

  const isSiteAdmin = isSuperadmin || userContext.role === "admin";

  return {
    ok: true,
    userContext,
    userId: userContext.userId,
    siteId: site.id,
    domain,
    organizationId: site.organization_id ?? null,
    isSuperadmin,
    isSiteAdmin,
    supportEnabled,
  };
}

export async function requireSupportSuperadmin(): Promise<
  { ok: true; userContext: UserContext; userId: string } | SupportAuthErr
> {
  const userContext = await getUserContext();
  if (!userContext?.userId) {
    return { ok: false, status: 401, error: "Non autenticato" };
  }
  if (userContext.role !== "superadmin") {
    return { ok: false, status: 403, error: "Solo superadmin" };
  }
  return { ok: true, userContext, userId: userContext.userId };
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function allowSupportRateLimit(
  key: string,
  max = 20,
  windowMs = 10 * 60 * 1000,
): boolean {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || now > current.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= max) return false;
  current.count += 1;
  return true;
}
