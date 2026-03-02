import { redirect } from "next/navigation";
import {
  requireServerSiteContext,
  fetchFatturazioneDashboardData,
  FatturazionePeriod,
} from "@/lib/server-data";
import { getUserContext } from "@/lib/auth-utils";
import { canAccessModule, isAdminOrSuperadmin } from "@/lib/permissions";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import {
  AgingFattureChart,
  IncassiWeeklyChart,
  FatturazioneStatusCards,
  FatturazionePeriodFilter,
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
  searchParams,
}: {
  params: Promise<{ domain: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { domain } = await params;
  const { period: periodParam } = await searchParams;
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
      userContext.role,
    );

    if (!hasDashboardAccess) {
      redirect(`/sites/${domain}`);
    }
  }

  // Parse period parameter
  const validPeriods: FatturazionePeriod[] = [
    "week",
    "month",
    "quarter",
    "year",
    "all",
  ];
  const period: FatturazionePeriod = validPeriods.includes(
    periodParam as FatturazionePeriod,
  )
    ? (periodParam as FatturazionePeriod)
    : "all";

  // Fetch invoicing dashboard data
  const dashboardData = await fetchFatturazioneDashboardData(
    siteContext.siteId,
    period,
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
          {/* Stato Fatture */}
          <FatturazioneStatusCards
            data={dashboardData.invoiceStatus}
            kanbanIdentifier={dashboardData.invoiceKanbanIdentifier}
            domain={domain}
          />

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
