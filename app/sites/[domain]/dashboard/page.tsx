import { requireServerSiteContext } from "@/lib/server-data";
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
    console.log("[Dashboard] generateMetadata failed for domain:", domain, error);
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
            <ProductionOrdersCard />
            <OffersChartCard />
          </div>

          {/* Offerte Card - Expanded */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <OffersCard />

            {/* Saldo del conto */}
            <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-green-500 text-xs font-medium bg-green-500/10 px-2 py-1 rounded">
                  +12%
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mb-2">
                Saldo del conto
              </p>
              <h3 className="text-2xl font-bold">CHF 487k</h3>
            </div>

            {/* HR */}
            <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-green-500 text-xs font-medium bg-green-500/10 px-2 py-1 rounded">
                  +12%
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mb-2">
                HR
              </p>
              <h3 className="text-2xl font-bold">24 / 26</h3>
            </div>
          </div>
        </div>
      </PageContent>
    </PageLayout>
  );
}
