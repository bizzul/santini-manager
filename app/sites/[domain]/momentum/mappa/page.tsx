import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { fetchMapData } from "@/lib/momentum-data";
import { PageLayout, PageContent } from "@/components/page-layout";
import MomentumHeader from "@/components/momentum/MomentumHeader";
import MomentumMap from "@/components/momentum/MomentumMap";

export default async function MomentumMappa({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const userContext = await getUserContext();
  if (!userContext?.user) return redirect("/login");

  const { siteId } = await requireServerSiteContext(domain);
  const data = await fetchMapData(siteId);

  return (
    <PageLayout>
      <div className="border-b bg-page/95 px-4 py-4 md:px-6 lg:px-8">
        <MomentumHeader subtitle="Mappa — location, eventi e offerte in Ticino" />
      </div>
      <PageContent>
        <MomentumMap data={data} domain={domain} />
      </PageContent>
    </PageLayout>
  );
}
