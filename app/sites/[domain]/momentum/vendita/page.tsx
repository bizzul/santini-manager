import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { fetchOfferte } from "@/lib/momentum-data";
import { PageLayout, PageContent } from "@/components/page-layout";
import MomentumHeader from "@/components/momentum/MomentumHeader";
import VenditaBoard from "@/components/momentum/VenditaBoard";

export default async function MomentumVendita({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const userContext = await getUserContext();
  if (!userContext?.user) return redirect("/login");

  const { siteId } = await requireServerSiteContext(domain);
  const offerte = await fetchOfferte(siteId);

  return (
    <PageLayout>
      <div className="border-b bg-page/95 px-4 py-4 md:px-6 lg:px-8">
        <MomentumHeader subtitle="Vendita — pipeline offerte" />
      </div>
      <PageContent>
        <VenditaBoard domain={domain} offerte={offerte} />
      </PageContent>
    </PageLayout>
  );
}
