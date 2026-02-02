import {
  requireServerSiteContext,
  fetchProduzioneDashboardData,
} from "@/lib/server-data";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import {
  CaricoRepartoChart,
  ProduzioneWeeklyChart,
} from "@/components/dashboard/produzione";
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
      title: `${siteContext.siteData?.name || "Site"} - Dashboard Produzione`,
    };
  } catch {
    return {
      title: "Dashboard Produzione",
    };
  }
}

export default async function ProduzioneDashboardPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const siteContext = await requireServerSiteContext(domain);

  // Fetch production dashboard data
  const dashboardData = await fetchProduzioneDashboardData(siteContext.siteId);

  return (
    <PageLayout>
      <DashboardTabs />
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard – Produzione
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitoraggio lavori in produzione e carico reparti
          </p>
        </div>
      </PageHeader>
      <PageContent>
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Carico per reparto */}
            <CaricoRepartoChart
              data={dashboardData.repartoData}
              productionKanbanId={dashboardData.productionKanbanId}
            />
            {/* Andamento settimanale */}
            <ProduzioneWeeklyChart
              data={dashboardData.weeklyTrend}
              columnNames={dashboardData.columnNames}
            />
          </div>
        </div>
      </PageContent>
    </PageLayout>
  );
}
