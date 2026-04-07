import { redirect } from "next/navigation";
import {
  requireServerSiteContext,
  fetchProductsDashboardData,
  fetchSiteVerticalProfile,
} from "@/lib/server-data";
import { getUserContext } from "@/lib/auth-utils";
import { canAccessModule, isAdminOrSuperadmin } from "@/lib/permissions";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import {
  ResaleKPICards,
  ResaleCategoryChart,
  ResaleProductsTable,
  ProductionKPICards,
  ProductionTrendChart,
  ProductionCategoryChart,
  ProdottiAlerts,
} from "@/components/dashboard/prodotti";
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
      title: `${siteContext.siteData?.name || "Site"} - Dashboard Prodotti`,
    };
  } catch (error) {
    console.log(
      "[Dashboard Prodotti] generateMetadata failed for domain:",
      domain,
      error
    );
    return {
      title: "Dashboard Prodotti",
    };
  }
}

export default async function ProdottiDashboardPage({
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

  // Fetch products dashboard data
  const dashboardData = await fetchProductsDashboardData(siteContext.siteId);

  return (
    <PageLayout>
      <DashboardTabs />
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {verticalProfile.pageCopy.productsTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {verticalProfile.pageCopy.productsSubtitle}
          </p>
        </div>
      </PageHeader>
      <PageContent>
        <div className="space-y-8">
          {/* ============================================ */}
          {/* SEZIONE 1: CATALOGO RIVENDITA */}
          {/* ============================================ */}
          <section>
            <h2 className="text-lg font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
              Catalogo Rivendita
            </h2>
            <div className="space-y-6">
              {/* Resale KPI Cards */}
              <ResaleKPICards data={dashboardData.resale} />

              {/* Resale Category Chart */}
              <ResaleCategoryChart
                data={dashboardData.resale.productsByCategory}
              />

              {/* Resale Products Table */}
              <ResaleProductsTable
                data={dashboardData.resale.products}
                categories={dashboardData.resale.productsByCategory}
              />
            </div>
          </section>

          {/* ============================================ */}
          {/* SEZIONE 2: PRODUZIONE FABBRICA */}
          {/* ============================================ */}
          <section>
            <h2 className="text-lg font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
              Produzione Fabbrica (in elementi)
            </h2>
            <div className="space-y-6">
              {/* Production KPI Cards */}
              <ProductionKPICards data={dashboardData.production} />

              {/* Production Charts Row */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Production Trend Chart */}
                <ProductionTrendChart
                  data={dashboardData.production.elementsByWeek}
                />
                {/* Production Category Chart */}
                <ProductionCategoryChart
                  data={dashboardData.production.elementsByCategory}
                />
              </div>
            </div>
          </section>

          {/* ============================================ */}
          {/* ALERT & CRITICITÀ */}
          {/* ============================================ */}
          <ProdottiAlerts data={dashboardData.alerts} />
        </div>
      </PageContent>
    </PageLayout>
  );
}
