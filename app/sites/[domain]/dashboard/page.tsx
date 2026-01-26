import {
  requireServerSiteContext,
  fetchDashboardData,
} from "@/lib/server-data";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import KPICards from "@/components/dashboard/KPICards";
import PipelineChart from "@/components/dashboard/PipelineChart";
import DepartmentWorkloadChart from "@/components/dashboard/DepartmentWorkloadChart";
import AggregatedKanbanStatus from "@/components/dashboard/AggregatedKanbanStatus";
import LatestNotifications from "@/components/dashboard/LatestNotifications";
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
      title: `${siteContext.siteData?.name || "Site"} - Dashboard`,
    };
  } catch (error) {
    // If site context fails, return a generic title
    // The page component will handle the error properly
    console.log(
      "[Dashboard] generateMetadata failed for domain:",
      domain,
      error
    );
    return {
      title: "Dashboard",
    };
  }
}

export default async function SiteDashboardPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const siteContext = await requireServerSiteContext(domain);

  // Fetch real dashboard data
  const dashboardData = await fetchDashboardData(siteContext.siteId);

  return (
    <PageLayout>
      <DashboardTabs />
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard - Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Panoramica generale dell&apos;azienda e KPI principali
          </p>
        </div>
      </PageHeader>
      <PageContent>
        <div className="space-y-6">
          {/* KPI Cards */}
          <KPICards data={dashboardData} />

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <PipelineChart data={dashboardData} />
            <DepartmentWorkloadChart data={dashboardData} />
          </div>

          {/* Status and Notifications Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <AggregatedKanbanStatus data={dashboardData} />
            <LatestNotifications siteId={siteContext.siteId} />
          </div>
        </div>
      </PageContent>
    </PageLayout>
  );
}
