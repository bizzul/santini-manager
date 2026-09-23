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

  const canSeeAll = userContext.role === "admin" || userContext.role === "superadmin";

  // Admin/superadmin see every ticket and proposal saved on this Space, not
  // just their own. Regular users still only get their own — enforced again
  // server-side by the support_tickets RLS policy either way, this just
  // avoids fetching rows that would be filtered out anyway.
  const tickets = await listSupportTickets({
    siteId: site.id,
    createdBy: canSeeAll ? undefined : userContext.userId,
  });

  return (
    <PageLayout>
      <PageHeader
        title="I miei ticket"
        subtitle={
          canSeeAll
            ? "Tutte le segnalazioni e proposte salvate su questo Spazio"
            : "Segnalazioni di supporto aperte da te su questo Spazio"
        }
      />
      <PageContent>
        <SupportTicketsTable
          tickets={tickets}
          basePath={`/sites/${domain}/supporto`}
          showSite={false}
        />
      </PageContent>
    </PageLayout>
  );
}
