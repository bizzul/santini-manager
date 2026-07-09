import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { getPmAccess } from "@/lib/personal-manager/queries";
import {
  AREA_SLUGS,
  resolveAreaPermissions,
  type AreaPermissions,
  type AreaSlug,
  type PmAccess,
} from "@/lib/personal-manager/types";

export interface PmPageContext {
  domain: string;
  siteId: string;
  userId: string;
  access: PmAccess;
  areasVisible: AreaSlug[];
}

/**
 * Contesto server per le pagine del Personal Manager. Ridondante con il gate
 * del layout, ma garantisce che ogni pagina abbia siteId/userId/permessi e che
 * i dati siano sempre filtrati sulle aree effettivamente visibili.
 */
export async function requirePmContext(domain: string): Promise<PmPageContext> {
  const userContext = await getUserContext();
  if (!userContext?.userId) {
    redirect("/login");
  }
  const { siteId } = await requireServerSiteContext(domain);
  const access = await getPmAccess(siteId, userContext.userId);
  if (!access || !access.beta_app_enabled) {
    // Il layout gia' mostra il BetaGate; qui evitiamo di renderizzare dati.
    redirect(`/sites/${domain}/personal-manager`);
  }
  const areasVisible = (access.areas_visible ?? []).filter(
    (slug): slug is AreaSlug => AREA_SLUGS.includes(slug as AreaSlug),
  );
  return {
    domain,
    siteId,
    userId: userContext.userId,
    access,
    areasVisible,
  };
}

export function areaPermissions(
  ctx: PmPageContext,
  slug: AreaSlug,
): AreaPermissions {
  return resolveAreaPermissions(ctx.access, slug);
}
