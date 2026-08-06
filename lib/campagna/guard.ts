import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { isCampagnaElettorale } from "@/lib/campagna/config";

/**
 * Guard for campaign-only pages. Ensures the user is authenticated and the site
 * is a `campagna_elettorale` site; otherwise redirects. Returns the site
 * context so pages never re-resolve it.
 */
export async function requireCampagnaContext(domain: string) {
  const userContext = await getUserContext();
  if (!userContext) redirect("/login");

  const context = await requireServerSiteContext(domain);
  if (!isCampagnaElettorale(context.siteData?.site_type)) {
    redirect(`/sites/${domain}`);
  }

  return { ...context, userContext };
}
