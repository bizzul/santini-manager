import { notFound } from "next/navigation";
import { PageContent, PageHeader, PageLayout } from "@/components/page-layout";
import { SupportTicketsTable } from "@/components/support/SupportTicketsTable";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { getSupportBotEnabledForSite } from "@/lib/support/settings.server";
import { listSupportTickets } from "@/lib/support/queries.server";

export const dynamic = "force-dynamic";

export default async function MySupportTicketsPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const userContext = await getUserContext();
  if (!userContext?.userId) notFound();

  const site = (await getSiteData(domain))?.data;
  if (!site?.id) notFound();

  const enabled = await getSupportBotEnabledForSite(site.id);
  if (!enabled && userContext.role !== "superadmin") notFound();

  const tickets = await listSupportTickets({
    siteId: site.id,
    createdBy: userContext.userId,
  });

  return (
    <PageLayout>
      <PageHeader
        title="I miei ticket"
        subtitle="Segnalazioni di supporto aperte da te su questo Spazio"
      />
      <PageContent>
        <SupportTicketsTable
          tickets={tickets}
          hrefFor={(ticket) => `/sites/${domain}/supporto/${ticket.id}`}
        />
      </PageContent>
    </PageLayout>
  );
}
