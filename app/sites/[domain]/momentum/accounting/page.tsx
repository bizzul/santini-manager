import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { fetchAccountingEventi } from "@/lib/momentum-data";
import { PageLayout, PageContent } from "@/components/page-layout";
import MomentumHeader from "@/components/momentum/MomentumHeader";
import AccountingBoard from "@/components/momentum/AccountingBoard";

export default async function MomentumAccounting({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const userContext = await getUserContext();
  if (!userContext?.user) return redirect("/login");

  const { siteId } = await requireServerSiteContext(domain);
  const eventi = await fetchAccountingEventi(siteId);

  return (
    <PageLayout>
      <div className="border-b bg-page/95 px-4 py-4 md:px-6 lg:px-8">
        <MomentumHeader subtitle="Accounting — fatturazione e margini" />
      </div>
      <PageContent>
        <AccountingBoard domain={domain} eventi={eventi} />
      </PageContent>
    </PageLayout>
  );
}
