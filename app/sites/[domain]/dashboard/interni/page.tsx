import {
  requireServerSiteContext,
  fetchInterniDashboardData,
} from "@/lib/server-data";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import {
  OreInterneChart,
  TrendOreInterneChart,
} from "@/components/dashboard/interni";
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
      title: `${
        siteContext.siteData?.name || "Site"
      } - Dashboard Lavori Interni`,
    };
  } catch {
    return {
      title: "Dashboard Lavori Interni",
    };
  }
}

export default async function InterniDashboardPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const siteContext = await requireServerSiteContext(domain);

  // Fetch internal work dashboard data
  const dashboardData = await fetchInterniDashboardData(siteContext.siteId);

  return (
    <PageLayout>
      <DashboardTabs />
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard – Lavori Interni
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitoraggio ore e attività interne
          </p>
        </div>
      </PageHeader>
      <PageContent>
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Ore interne per categoria */}
            <OreInterneChart data={dashboardData.categoriaData} />
            {/* Trend ore interne */}
            <TrendOreInterneChart data={dashboardData.weeklyTrend} />
          </div>
        </div>
      </PageContent>
    </PageLayout>
  );
}
