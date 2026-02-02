import {
  requireServerSiteContext,
  fetchVenditaDashboardData,
} from "@/lib/server-data";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import OfferStatusCards from "@/components/dashboard/vendita/OfferStatusCards";
import CategorieOfferteChart from "@/components/dashboard/vendita/CategorieOfferteChart";
import PipelineTrendChart from "@/components/dashboard/vendita/PipelineTrendChart";
import VenditaKPICards from "@/components/dashboard/vendita/VenditaKPICards";
import AlertOfferte from "@/components/dashboard/vendita/AlertOfferte";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  try {
    const siteContext = await requireServerSiteContext(domain);
    return {
      title: `${siteContext.siteData?.name || "Site"} - Dashboard Vendita`,
    };
  } catch (error) {
    console.log(
      "[Dashboard Vendita] generateMetadata failed for domain:",
      domain,
      error
    );
    return {
      title: "Dashboard Vendita",
    };
  }
}

export const revalidate = 0; // Disable caching for debugging

export default async function VenditaDashboardPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  console.log("[Vendita Page] Domain:", domain);

  const siteContext = await requireServerSiteContext(domain);
  console.log("[Vendita Page] Site context siteId:", siteContext.siteId);

  // Fetch real dashboard data
  const dashboardData = await fetchVenditaDashboardData(siteContext.siteId);

  return (
    <PageLayout>
      <DashboardTabs />
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard – Vendita
          </h1>
          <p className="text-sm text-muted-foreground">
            Pipeline commerciale, gestione offerte e analisi conversioni
          </p>
        </div>
      </PageHeader>
      <PageContent>
        <div className="space-y-6">
          {/* Stato Offerte Section */}
          <OfferStatusCards data={dashboardData.offerStatus} />

          {/* Charts Row: Categorie Offerte + Pipeline & Trend Offerte */}
          <div className="grid gap-4 md:grid-cols-2">
            <CategorieOfferteChart data={dashboardData.categoriesData} />
            <PipelineTrendChart data={dashboardData.pipelineTrend} />
          </div>

          {/* KPI Cards + Alert Row */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <VenditaKPICards data={dashboardData.kpis} />
            </div>
            <AlertOfferte data={dashboardData.alerts} />
          </div>
        </div>
      </PageContent>
    </PageLayout>
  );
}
