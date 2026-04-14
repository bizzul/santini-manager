import { redirect } from "next/navigation";
import {
  requireServerSiteContext,
  fetchDashboardData,
  fetchSiteVerticalProfile,
  fetchSiteModules,
} from "@/lib/server-data";
import { getUserContext } from "@/lib/auth-utils";
import { canAccessModule, isAdminOrSuperadmin } from "@/lib/permissions";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import KPICards from "@/components/dashboard/KPICards";
import AggregatedKanbanStatus from "@/components/dashboard/AggregatedKanbanStatus";
import LatestNotifications from "@/components/dashboard/LatestNotifications";
import ForecastInteractiveCharts from "@/components/dashboard/ForecastInteractiveCharts";
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
      title: `${siteContext.siteData?.name || "Site"} - Forecast`,
    };
  } catch (error) {
    console.log(
      "[Forecast] generateMetadata failed for domain:",
      domain,
      error
    );
    return {
      title: "Forecast",
    };
  }
}

export default async function SiteDashboardForecastPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const siteContext = await requireServerSiteContext(domain);
  const verticalProfile = await fetchSiteVerticalProfile(siteContext.siteId);
  const siteModules = await fetchSiteModules(siteContext.siteId);
  const isForecastEnabled = siteModules.some(
    (module) => module.name === "dashboard-forecast" && module.isEnabled
  );

  if (!isForecastEnabled) {
    redirect(`/sites/${domain}/dashboard`);
  }

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

  const dashboardData = await fetchDashboardData(siteContext.siteId);

  return (
    <PageLayout>
      <DashboardTabs />
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Forecast - {verticalProfile.pageCopy.dashboardOverviewTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            Copia della dashboard con drilldown integrazioni e accuratezza
            previsionale.
          </p>
        </div>
      </PageHeader>
      <PageContent>
        <div className="space-y-6">
          <KPICards data={dashboardData} />

          <ForecastInteractiveCharts data={dashboardData} />

          <div className="grid gap-4 md:grid-cols-2">
            <AggregatedKanbanStatus data={dashboardData} />
            <LatestNotifications siteId={siteContext.siteId} />
          </div>
        </div>
      </PageContent>
    </PageLayout>
  );
}
