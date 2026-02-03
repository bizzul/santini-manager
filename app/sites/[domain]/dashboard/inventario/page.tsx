import {
  requireServerSiteContext,
  fetchInventoryDashboardData,
} from "@/lib/server-data";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import {
  InventarioKPICards,
  ValueByCategoryChart,
  ValueTrendChart,
  TopItemsTable,
  InventarioAlerts,
} from "@/components/dashboard/inventario";
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
      title: `${siteContext.siteData?.name || "Site"} - Dashboard Inventario`,
    };
  } catch (error) {
    console.log(
      "[Dashboard Inventario] generateMetadata failed for domain:",
      domain,
      error
    );
    return {
      title: "Dashboard Inventario",
    };
  }
}

export default async function InventarioDashboardPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const siteContext = await requireServerSiteContext(domain);

  // Fetch inventory dashboard data
  const dashboardData = await fetchInventoryDashboardData(siteContext.siteId);

  return (
    <PageLayout>
      <DashboardTabs />
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard – Inventario
          </h1>
          <p className="text-sm text-muted-foreground">
            Valore stock, categorie e criticità
          </p>
        </div>
      </PageHeader>
      <PageContent>
        <div className="space-y-6">
          {/* KPI Cards */}
          <InventarioKPICards data={dashboardData} />

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Valore inventario per categoria */}
            <ValueByCategoryChart data={dashboardData.valueByCategory} />
            {/* Trend movimenti settimanali */}
            <ValueTrendChart data={dashboardData.valueTrend} />
          </div>

          {/* Top Items Table */}
          <TopItemsTable data={dashboardData.topItems} />

          {/* Anomalie e Criticità */}
          <InventarioAlerts data={dashboardData.alerts} />
        </div>
      </PageContent>
    </PageLayout>
  );
}
