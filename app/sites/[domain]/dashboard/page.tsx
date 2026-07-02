import { redirect } from "next/navigation";
import {
  requireServerSiteContext,
  fetchDashboardData,
  fetchSiteVerticalProfile,
} from "@/lib/server-data";
import { getUserContext } from "@/lib/auth-utils";
import { canAccessModule, isAdminOrSuperadmin } from "@/lib/permissions";
import { getSiteHighlightCountries } from "@/lib/map-highlight.server";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import KPICards from "@/components/dashboard/KPICards";
import ActiveProjectsMapCard from "@/components/dashboard/ActiveProjectsMapCard";
import PipelineChart from "@/components/dashboard/PipelineChart";
import DepartmentWorkloadChart from "@/components/dashboard/DepartmentWorkloadChart";
import LatestNotifications from "@/components/dashboard/LatestNotifications";
import { MagicDashboard3DLauncher } from "@/components/dashboard-3d/MagicDashboard3DLauncher";
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
  const highlightCountries = await getSiteHighlightCountries(siteContext.siteId);

  return (
    <PageLayout>
      <DashboardTabs initialVerticalProfile={verticalProfile} />
      <PageHeader
        title={verticalProfile.pageCopy.dashboardOverviewTitle}
        subtitle={verticalProfile.pageCopy.dashboardOverviewSubtitle}
      />
      <PageContent>
        <div className="space-y-6">
          <KPICards data={dashboardData} />
          <ActiveProjectsMapCard
            mapHeightClassName="h-[500px]"
            domain={domain}
            projects={dashboardData.activeProjectLocations}
            highlightCountries={highlightCountries}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <PipelineChart data={dashboardData} />
            <DepartmentWorkloadChart data={dashboardData} />
          </div>
          <LatestNotifications siteId={siteContext.siteId} />
        </div>
      </PageContent>
      <MagicDashboard3DLauncher
        domain={domain}
        siteId={siteContext.siteId}
        userId={userContext.userId || userContext.user.id}
      />
    </PageLayout>
  );
}
