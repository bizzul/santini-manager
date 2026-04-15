import { redirect } from "next/navigation";
import {
  requireServerSiteContext,
  fetchDashboardData,
  fetchSiteVerticalProfile,
} from "@/lib/server-data";
import { getUserContext } from "@/lib/auth-utils";
import { canAccessModule, isAdminOrSuperadmin } from "@/lib/permissions";
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
  const verticalProfile = await fetchSiteVerticalProfile(siteContext.siteId);

  // Check dashboard permission
  const userContext = await getUserContext();
  if (!userContext) {
    redirect("/login");
  }

  if (!isAdminOrSuperadmin(userContext.role)) {
    const hasDashboardAccess = await canAccessModule(
      userContext.userId || userContext.user.id,
      siteContext.siteId,
      "dashboard",
      userContext.role
    );

    if (!hasDashboardAccess) {
      redirect(`/sites/${domain}`);
    }
  }

  // Fetch real dashboard data
  const dashboardData = await fetchDashboardData(siteContext.siteId);

  return (
    <PageLayout>
      <DashboardTabs />
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {verticalProfile.pageCopy.dashboardOverviewTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {verticalProfile.pageCopy.dashboardOverviewSubtitle}
          </p>
        </div>
      </PageHeader>
      <PageContent>
        <div className="space-y-6">
          <KPICards data={dashboardData} />
          <div className="grid gap-4 md:grid-cols-2">
            <PipelineChart data={dashboardData} />
            <DepartmentWorkloadChart data={dashboardData} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <AggregatedKanbanStatus data={dashboardData} />
            <LatestNotifications siteId={siteContext.siteId} />
          </div>
        </div>
      </PageContent>
    </PageLayout>
  );
}
