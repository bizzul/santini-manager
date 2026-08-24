import { notFound } from "next/navigation";
import { PageContent, PageHeader, PageLayout } from "@/components/page-layout";
import { SupportTicketDetailView } from "@/components/support/SupportTicketDetail";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { getSupportBotEnabledForSite } from "@/lib/support/settings.server";
import { getSupportTicketDetail } from "@/lib/support/queries.server";
import { formatTicketNumber } from "@/lib/support/settings";

export const dynamic = "force-dynamic";

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ domain: string; id: string }>;
}) {
  const { domain, id } = await params;
  const userContext = await getUserContext();
  if (!userContext?.userId) notFound();

  const site = (await getSiteData(domain))?.data;
  if (!site?.id) notFound();

  const enabled = await getSupportBotEnabledForSite(site.id);
  if (!enabled && userContext.role !== "superadmin") notFound();

  const ticket = await getSupportTicketDetail(id);
  if (!ticket || (ticket.siteId !== site.id && userContext.role !== "superadmin")) {
    notFound();
  }

  const isAdmin =
    userContext.role === "admin" || userContext.role === "superadmin";

  return (
    <PageLayout>
      <PageHeader
        title={formatTicketNumber(ticket.publicNumber)}
        subtitle={ticket.subject}
      />
      <PageContent>
        <SupportTicketDetailView
          ticket={ticket}
          domain={domain}
          isAdmin={isAdmin}
        />
      </PageContent>
    </PageLayout>
  );
}
