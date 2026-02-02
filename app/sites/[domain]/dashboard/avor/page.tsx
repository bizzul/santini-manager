import {
  requireServerSiteContext,
  fetchAvorDashboardData,
} from "@/lib/server-data";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import AvorStatusCards from "@/components/dashboard/avor/AvorStatusCards";
import AvorWorkloadChart from "@/components/dashboard/avor/AvorWorkloadChart";
import AvorWeeklyTrendChart from "@/components/dashboard/avor/AvorWeeklyTrendChart";
import AvorAlerts from "@/components/dashboard/avor/AvorAlerts";
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
      title: `${siteContext.siteData?.name || "Site"} - Dashboard AVOR`,
    };
  } catch (error) {
    console.log(
      "[Dashboard AVOR] generateMetadata failed for domain:",
      domain,
      error
    );
    return {
      title: "Dashboard AVOR",
    };
  }
}

export default async function AvorDashboardPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const siteContext = await requireServerSiteContext(domain);

  // Fetch AVOR dashboard data
  const dashboardData = await fetchAvorDashboardData(siteContext.siteId);

  return (
    <PageLayout>
      <DashboardTabs />
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard – AVOR
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestione pratiche ufficio tecnico e stato lavorazioni
          </p>
        </div>
      </PageHeader>
      <PageContent>
        <div className="space-y-6">
          {/* Stato Pratiche AVOR - KPI per colonna */}
          <AvorStatusCards
            data={dashboardData.columnStatus}
            avorKanbanId={dashboardData.avorKanbanId}
          />

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Carico di lavoro per tipologia */}
            <AvorWorkloadChart
              data={dashboardData.workloadData}
              columnNames={dashboardData.columnNames}
            />
            {/* Andamento settimanale */}
            <AvorWeeklyTrendChart
              data={dashboardData.weeklyTrend}
              columnNames={dashboardData.columnNames}
            />
          </div>

          {/* Alert & Criticità */}
          <AvorAlerts
            data={dashboardData.alerts}
            avorKanbanId={dashboardData.avorKanbanId}
          />
        </div>
      </PageContent>
    </PageLayout>
  );
}
