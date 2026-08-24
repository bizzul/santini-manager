import { notFound } from "next/navigation";
import { PageContent, PageHeader, PageLayout } from "@/components/page-layout";
import { SupportKbManager } from "@/components/support/SupportKbManager";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { getSupportBotEnabledForSite } from "@/lib/support/settings.server";
import { listKbArticles } from "@/lib/support/queries.server";

export const dynamic = "force-dynamic";

export default async function SupportKbPage({
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

  const articles = await listKbArticles({ siteId: site.id });

  return (
    <PageLayout>
      <PageHeader
        title="Knowledge base"
        subtitle="Articoli globali e specifici di questo Spazio"
      />
      <PageContent>
        <SupportKbManager articles={articles} domain={domain} />
      </PageContent>
    </PageLayout>
  );
}
