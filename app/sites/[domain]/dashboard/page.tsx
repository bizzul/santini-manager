import {
  requireServerSiteContext,
  fetchDashboardData,
} from "@/lib/server-data";
import { DollarSign, Users } from "lucide-react";
import OffersCard from "@/components/dashboard/OffersCard";
import ProductionOrdersCard from "@/components/dashboard/ProductionOrdersCard";
import OffersChartCard from "@/components/dashboard/OffersChartCard";
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

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `CHF ${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `CHF ${(value / 1000).toFixed(0)}k`;
  }
  return `CHF ${value.toFixed(0)}`;
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
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Home</h1>
          <p className="text-sm text-muted-foreground">
            Stato generale – aggiornamento odierno
          </p>
        </div>
      </PageHeader>
      <PageContent>
        <div className="space-y-6">
          {/* Top Cards with Production Orders and Offers */}
          <div className="grid gap-4 md:grid-cols-2">
            <OffersChartCard data={dashboardData.offers} />
            <ProductionOrdersCard data={dashboardData.orders} />
          </div>

          {/* Offerte Card - Expanded */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <OffersCard data={dashboardData.offers} />

            {/* Saldo del conto - Valore totale ordini */}
            {/* <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                </div>
                {dashboardData.orders.totalValue > 0 && (
                  <span className="text-green-500 text-xs font-medium bg-green-500/10 px-2 py-1 rounded">
                    Attivo
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-medium mb-2">
                Valore Ordini
              </p>
              <h3 className="text-2xl font-bold">
                {formatCurrency(dashboardData.orders.totalValue)}
              </h3>
            </div> */}

            {/* HR */}
            {/* <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-500" />
                </div>
                {dashboardData.hr.activeEmployees === dashboardData.hr.totalEmployees && dashboardData.hr.totalEmployees > 0 && (
                  <span className="text-green-500 text-xs font-medium bg-green-500/10 px-2 py-1 rounded">
                    Tutti attivi
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-medium mb-2">
                Collaboratori
              </p>
              <h3 className="text-2xl font-bold">
                {dashboardData.hr.activeEmployees} / {dashboardData.hr.totalEmployees}
              </h3>
            </div> */}
          </div>
        </div>
      </PageContent>
    </PageLayout>
  );
}
