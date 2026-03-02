import { redirect } from "next/navigation";
import {
  requireServerSiteContext,
  fetchVenditaDashboardData,
} from "@/lib/server-data";
import { getUserContext } from "@/lib/auth-utils";
import { canAccessModule, isAdminOrSuperadmin } from "@/lib/permissions";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import OfferStatusCards from "@/components/dashboard/vendita/OfferStatusCards";
import CategorieOfferteChart from "@/components/dashboard/vendita/CategorieOfferteChart";
import PipelineTrendChart from "@/components/dashboard/vendita/PipelineTrendChart";
import AlertOfferte from "@/components/dashboard/vendita/AlertOfferte";
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
      title: `${siteContext.siteData?.name || "Site"} - Dashboard Vendita`,
    };
  } catch (error) {
    console.log(
      "[Dashboard Vendita] generateMetadata failed for domain:",
      domain,
      error
    );
    return {
      title: "Dashboard Vendita",
    };
  }
}

export default async function VenditaDashboardPage({
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

  // Fetch real dashboard data
  const dashboardData = await fetchVenditaDashboardData(siteContext.siteId);

  return (
    <PageLayout>
      <DashboardTabs />
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard – Vendita
          </h1>
          <p className="text-sm text-muted-foreground">
            Pipeline commerciale, gestione offerte e analisi conversioni
          </p>
        </div>
      </PageHeader>
      <PageContent>
        <div className="space-y-6">
          {/* Stato Offerte Section */}
          <OfferStatusCards
            data={dashboardData.offerStatus}
            kanbanIdentifier={dashboardData.offerKanbanIdentifier}
            domain={domain}
          />

          {/* Charts Row: Categorie Offerte + Pipeline & Trend Offerte */}
          <div className="grid gap-4 md:grid-cols-2">
            <CategorieOfferteChart data={dashboardData.categoriesData} />
            <PipelineTrendChart data={dashboardData.pipelineTrend} />
          </div>

          {/* Alert Offerte */}
          <AlertOfferte data={dashboardData.alerts} />
        </div>
      </PageContent>
    </PageLayout>
  );
}
