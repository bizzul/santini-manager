import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { fetchFornitori } from "@/lib/momentum-data";
import { PageLayout, PageContent } from "@/components/page-layout";
import MomentumHeader from "@/components/momentum/MomentumHeader";
import FornitoriClient from "@/components/momentum/FornitoriClient";

export default async function MomentumFornitori({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const userContext = await getUserContext();
  if (!userContext?.user) return redirect("/login");

  const { siteId } = await requireServerSiteContext(domain);
  const fornitori = await fetchFornitori(siteId);

  return (
    <PageLayout>
      <div className="border-b bg-page/95 px-4 py-4 md:px-6 lg:px-8">
        <MomentumHeader subtitle="Fornitori — anagrafica e posizione sulla mappa" />
      </div>
      <PageContent>
        <FornitoriClient domain={domain} fornitori={fornitori} />
      </PageContent>
    </PageLayout>
  );
}
