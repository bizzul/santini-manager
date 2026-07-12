import { notFound, redirect } from "next/navigation";
import { getServerSiteContext } from "@/lib/server-data";
import { getUserContext } from "@/lib/auth-utils";
import { canAccessModule, isAdminOrSuperadmin, getUserPermissions } from "@/lib/permissions";
import { UserHomeMinimal } from "@/components/user-home-minimal";
import { OverviewConnector } from "@/components/overview/OverviewConnector";
import { getOverviewData } from "@/app/sites/[domain]/overview/data";
import type {
  AttivitaStato,
  OverviewFilters,
  SpazioFilter,
} from "@/types/overview-connector";

/** Sottodominio dello spazio Matris: la sua home E' la Overview Connector. */
const MATRIS_SUBDOMAIN = "matrispro";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function parseFilters(searchParams: SearchParams): OverviewFilters {
  const spazioRaw = firstValue(searchParams.spazio);
  const spazio: SpazioFilter =
    spazioRaw === "azienda" || spazioRaw === "privato" ? spazioRaw : "tutto";

  const statoRaw = firstValue(searchParams.stato);
  const stato: AttivitaStato | null =
    statoRaw === "todo" || statoRaw === "doing" || statoRaw === "finish"
      ? statoRaw
      : null;

  return {
    spazio,
    stato,
    ambito: firstValue(searchParams.ambito),
    azienda: firstValue(searchParams.azienda),
    persona: firstValue(searchParams.persona),
  };
}

export default async function SiteHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { domain } = await params;

  const siteContext = await getServerSiteContext(domain);

  if (!siteContext) {
    notFound();
  }

  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  // Spazio Matris: la home E' la dashboard Overview Connector (non un redirect).
  if (siteContext.siteData?.subdomain === MATRIS_SUBDOMAIN) {
    const filters = parseFilters(await searchParams);
    const data = await getOverviewData(siteContext.siteId, domain, filters);
    return <OverviewConnector data={data} />;
  }

  // Admin/superadmin always have access to dashboard
  if (isAdminOrSuperadmin(userContext.role)) {
    redirect(`/sites/${domain}/dashboard`);
  }

  // Check if user has dashboard permission
  const hasDashboardAccess = await canAccessModule(
    userContext.userId || userContext.user.id,
    siteContext.siteId,
    "dashboard",
    userContext.role
  );

  if (hasDashboardAccess) {
    redirect(`/sites/${domain}/dashboard`);
  }

  // User doesn't have dashboard access - show home minimal
  const permissions = await getUserPermissions(
    userContext.userId || userContext.user.id,
    siteContext.siteId
  );

  const userName = userContext.user?.user_metadata?.given_name || 
                   userContext.user?.user_metadata?.full_name?.split(" ")[0] || 
                   "";

  return (
    <UserHomeMinimal
      userName={userName}
      domain={domain}
      availableModules={permissions?.modules || []}
    />
  );
}
