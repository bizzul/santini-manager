import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { fetchDashboardData } from "@/lib/momentum-data";
import { PageLayout, PageContent } from "@/components/page-layout";
import MomentumHeader from "@/components/momentum/MomentumHeader";
import ProssimiEventiCard from "@/components/momentum/ProssimiEventiCard";
import RedditivitaChart from "@/components/momentum/RedditivitaChart";

export default async function MomentumHome({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const userContext = await getUserContext();
  if (!userContext?.user) return redirect("/login");

  const { siteId } = await requireServerSiteContext(domain);
  const dashboard = await fetchDashboardData(siteId);

  return (
    <PageLayout>
      <div className="border-b bg-page/95 px-4 py-4 md:px-6 lg:px-8">
        <MomentumHeader subtitle="Gestione eventi end-to-end: vendita, pianificazione e accounting" />
      </div>
      <PageContent>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Prossimi eventi
            </h2>
            <ProssimiEventiCard
              eventi={dashboard.prossimiEventi}
              domain={domain}
            />
          </section>
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Redditività per format
            </h2>
            <RedditivitaChart
              perCategoria={dashboard.redditivita.perCategoria}
            />
          </section>
        </div>
      </PageContent>
    </PageLayout>
  );
}
