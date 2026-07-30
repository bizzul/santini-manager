import { redirect } from "next/navigation";
import {
  requireServerSiteContext,
  fetchAvorDashboardData,
  fetchSiteVerticalProfile,
} from "@/lib/server-data";
import { getUserContext } from "@/lib/auth-utils";
import { canAccessModule, isAdminOrSuperadmin } from "@/lib/permissions";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import AvorColumnCards from "@/components/dashboard/avor/AvorColumnCards";
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
    const verticalProfile = await fetchSiteVerticalProfile(siteContext.siteId);
    return {
      title: `${siteContext.siteData?.name || "Site"} - ${verticalProfile.pageCopy.avorTitle}`,
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

  // Fetch AVOR dashboard data
  const dashboardData = await fetchAvorDashboardData(siteContext.siteId);
  const verticalProfile = await fetchSiteVerticalProfile(siteContext.siteId);

  return (
    <PageLayout>
      <DashboardTabs initialVerticalProfile={verticalProfile} />
      <PageHeader
        title={verticalProfile.pageCopy.avorTitle}
        subtitle={verticalProfile.pageCopy.avorSubtitle}
      />
      <PageContent>
        <div className="space-y-6">
          {/* Stato pratiche — KPI per colonna + prodotti per categoria */}
          <AvorColumnCards
            columnStatus={dashboardData.columnStatus}
            columnWorkload={dashboardData.columnWorkload}
            avorKanbanIdentifier={dashboardData.avorKanbanIdentifier}
            sectionTitle={verticalProfile.pageCopy.avorSectionTitle}
            avorLabel={verticalProfile.dashboardTabs.avor}
          />

          {/* Andamento settimanale */}
          <AvorWeeklyTrendChart
            data={dashboardData.weeklyTrend}
            columnNames={dashboardData.columnNames}
          />

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
