import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { fetchEventiPlan } from "@/lib/momentum-data";
import { PageLayout, PageContent } from "@/components/page-layout";
import MomentumHeader from "@/components/momentum/MomentumHeader";
import PlanBoard from "@/components/momentum/PlanBoard";

export default async function MomentumPlan({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const userContext = await getUserContext();
  if (!userContext?.user) return redirect("/login");

  const { siteId } = await requireServerSiteContext(domain);
  const eventi = await fetchEventiPlan(siteId);

  return (
    <PageLayout>
      <div className="border-b bg-page/95 px-4 py-4 md:px-6 lg:px-8">
        <MomentumHeader subtitle="Plan — pianificazione eventi" />
      </div>
      <PageContent>
        <PlanBoard domain={domain} eventi={eventi} />
      </PageContent>
    </PageLayout>
  );
}
