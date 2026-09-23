import { notFound } from "next/navigation";
import Link from "next/link";
import { PageContent, PageHeader, PageLayout } from "@/components/page-layout";
import { SupportTicketsTable } from "@/components/support/SupportTicketsTable";
import { Button } from "@/components/ui/button";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { getSupportBotEnabledForSite } from "@/lib/support/settings.server";
import { listSupportTickets } from "@/lib/support/queries.server";

export const dynamic = "force-dynamic";

export default async function SupportAdminPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const userContext = await getUserContext();
  if (!userContext?.userId) notFound();
  if (userContext.role !== "admin" && userContext.role !== "superadmin") {
    notFound();
  }

  const site = (await getSiteData(domain))?.data;
  if (!site?.id) notFound();

  const enabled = await getSupportBotEnabledForSite(site.id);
  if (!enabled && userContext.role !== "superadmin") notFound();

  const tickets = await listSupportTickets({ siteId: site.id });

  return (
    <PageLayout>
      <PageHeader
        title="Supporto"
        subtitle="Ticket dello Spazio"
        actions={
          <Button asChild variant="outline">
            <Link href={`/sites/${domain}/supporto/gestione/kb`}>
              Knowledge base
            </Link>
          </Button>
        }
      />
      <PageContent>
        <SupportTicketsTable
          tickets={tickets}
          basePath={`/sites/${domain}/supporto`}
        />
      </PageContent>
    </PageLayout>
  );
}
