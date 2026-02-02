import {
  requireServerSiteContext,
  fetchFatturazioneDashboardData,
} from "@/lib/server-data";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import {
  AgingFattureChart,
  IncassiWeeklyChart,
} from "@/components/dashboard/fatturazione";
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
      title: `${siteContext.siteData?.name || "Site"} - Dashboard Fatturazione`,
    };
  } catch {
    return {
      title: "Dashboard Fatturazione",
    };
  }
}

export default async function FatturazioneDashboardPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const siteContext = await requireServerSiteContext(domain);

  // Fetch invoicing dashboard data
  const dashboardData = await fetchFatturazioneDashboardData(
    siteContext.siteId
  );

  return (
    <PageLayout>
      <DashboardTabs />
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard – Fatturazione
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitoraggio fatture, scadenze e incassi
          </p>
        </div>
      </PageHeader>
      <PageContent>
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Aging fatture */}
            <AgingFattureChart
              data={dashboardData.agingData}
              invoiceKanbanId={dashboardData.invoiceKanbanId}
            />
            {/* Incassi per settimana */}
            <IncassiWeeklyChart data={dashboardData.weeklyTrend} />
          </div>
        </div>
      </PageContent>
    </PageLayout>
  );
}
