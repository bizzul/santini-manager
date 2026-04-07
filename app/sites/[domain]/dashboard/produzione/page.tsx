import { redirect } from "next/navigation";
import {
  requireServerSiteContext,
  fetchProduzioneDashboardData,
  fetchSiteVerticalProfile,
} from "@/lib/server-data";
import { getUserContext } from "@/lib/auth-utils";
import { canAccessModule, isAdminOrSuperadmin } from "@/lib/permissions";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import {
  ProduzioneProductWorkloadChart,
  ProduzioneStatusCards,
} from "@/components/dashboard/produzione";
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
      title: `${siteContext.siteData?.name || "Site"} - Dashboard Produzione`,
    };
  } catch {
    return {
      title: "Dashboard Produzione",
    };
  }
}

export default async function ProduzioneDashboardPage({
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

  // Fetch production dashboard data
  const dashboardData = await fetchProduzioneDashboardData(siteContext.siteId);

  return (
    <PageLayout>
      <DashboardTabs />
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {verticalProfile.pageCopy.productionTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {verticalProfile.pageCopy.productionSubtitle}
          </p>
        </div>
      </PageHeader>
      <PageContent>
        <div className="space-y-6">
          {/* Stato Produzione - solo se c'è la categoria Produzione */}
          {dashboardData.hasProduzionCategory && dashboardData.kanbanStatus.length > 0 && (
            <ProduzioneStatusCards
              data={dashboardData.kanbanStatus}
              domain={domain}
            />
          )}

          {/* Carico per tipologia prodotto */}
          {dashboardData.hasProduzionCategory && (
            <ProduzioneProductWorkloadChart
              data={dashboardData.productWorkload}
            />
          )}
        </div>
      </PageContent>
    </PageLayout>
  );
}
