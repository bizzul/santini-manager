import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { requireCampagnaContext } from "@/lib/campagna/guard";
import { fetchContatti } from "@/lib/campagna/server-data";
import ContattiClient from "@/components/campagna/ContattiClient";
import ContattoFormDialog from "@/components/campagna/ContattoFormDialog";

export const metadata = { title: "CRM - Contatti" };

export default async function ContattiPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const { siteId } = await requireCampagnaContext(domain);
  const contatti = await fetchContatti(siteId);

  return (
    <PageLayout>
      <PageHeader
        title="Contatti"
        subtitle="Elettori, volontari, donatori e simpatizzanti della campagna"
        actions={<ContattoFormDialog domain={domain} />}
      />
      <PageContent>
        <ContattiClient contatti={contatti} domain={domain} />
      </PageContent>
    </PageLayout>
  );
}
