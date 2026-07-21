import { redirect } from "next/navigation";
import {
  requireServerSiteContext,
  fetchAvorDashboardData,
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

  return (
    <PageLayout>
      <DashboardTabs />
      <PageHeader
        title="Dashboard – AVOR"
        subtitle="Gestione pratiche ufficio tecnico e stato lavorazioni"
      />
      <PageContent>
        <div className="space-y-6">
          {/* Stato Pratiche AVOR - KPI per colonna + prodotti per categoria */}
          <AvorColumnCards
            columnStatus={dashboardData.columnStatus}
            columnWorkload={dashboardData.columnWorkload}
            avorKanbanIdentifier={dashboardData.avorKanbanIdentifier}
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
