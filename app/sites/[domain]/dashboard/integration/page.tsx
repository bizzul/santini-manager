import { redirect } from "next/navigation";
import {
  requireServerSiteContext,
  fetchSiteVerticalProfile,
} from "@/lib/server-data";
import { getUserContext } from "@/lib/auth-utils";
import { canAccessModule, isAdminOrSuperadmin } from "@/lib/permissions";
import { getSiteHighlightCountries } from "@/lib/map-highlight.server";
import { getServerT } from "@/lib/i18n/server";
import { COUNTRY_CAPITALS } from "@/lib/map-capitals";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import DashboardIntegrationGraph, {
  type CountryDashboardNode,
  type OperationalDashboardNode,
} from "@/components/dashboard/DashboardIntegrationGraph";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";

export default async function DashboardIntegrationPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const siteContext = await requireServerSiteContext(domain);
  const verticalProfile = await fetchSiteVerticalProfile(siteContext.siteId);

  const userContext = await getUserContext();
  if (!userContext) {
    redirect("/login");
  }

  if (!isAdminOrSuperadmin(userContext.role)) {
    const hasDashboardAccess = await canAccessModule(
      userContext.userId || userContext.user.id,
      siteContext.siteId,
      "dashboard",
      userContext.role,
    );
    if (!hasDashboardAccess) {
      redirect(`/sites/${domain}`);
    }
  }

  const { t } = await getServerT(siteContext.siteId);
  const highlight = await getSiteHighlightCountries(siteContext.siteId);
  const tabs = verticalProfile.dashboardTabs;

  const operational: OperationalDashboardNode[] = [
    { id: "vendita", label: tabs.vendita, href: `/sites/${domain}/dashboard/vendita`, color: "#3b82f6" },
    { id: "avor", label: "AVOR", href: `/sites/${domain}/dashboard/avor`, color: "#f97316" },
    { id: "produzione", label: tabs.produzione, href: `/sites/${domain}/dashboard/produzione`, color: "#22c55e" },
    { id: "fatturazione", label: "Fatturazione", href: `/sites/${domain}/dashboard/fatturazione`, color: "#10b981" },
    { id: "interni", label: "Interni", href: `/sites/${domain}/dashboard/interni`, color: "#8b5cf6" },
    { id: "inventario", label: tabs.inventario, href: `/sites/${domain}/dashboard/inventario`, color: "#06b6d4" },
    { id: "prodotti", label: tabs.prodotti, href: `/sites/${domain}/dashboard/prodotti`, color: "#eab308" },
  ];

  const countries: CountryDashboardNode[] = highlight
    .map((iso3) => {
      const info = COUNTRY_CAPITALS[iso3];
      return info ? { iso2: info.iso2, iso3, name: info.name } : null;
    })
    .filter((c): c is CountryDashboardNode => c !== null);

  return (
    <PageLayout>
      <DashboardTabs initialVerticalProfile={verticalProfile} />
      <PageHeader
        title={t("dashboard.integrationTitle")}
        subtitle={t("dashboard.integrationSubtitle")}
      />
      <PageContent>
        <div className="h-[72vh] min-h-[520px]">
          <DashboardIntegrationGraph
            domain={domain}
            hubLabel={tabs.overview}
            operational={operational}
            countries={countries}
          />
        </div>
      </PageContent>
    </PageLayout>
  );
}
