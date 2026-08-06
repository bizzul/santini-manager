import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { requireCampagnaContext } from "@/lib/campagna/guard";
import { fetchContenuti } from "@/lib/campagna/server-data";
import ContenutiClient from "@/components/campagna/ContenutiClient";
import ContenutoFormDialog from "@/components/campagna/ContenutoFormDialog";

export const metadata = { title: "Contenuti" };

export default async function ContenutiPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const { siteId } = await requireCampagnaContext(domain);
  const contenuti = await fetchContenuti(siteId);

  return (
    <PageLayout>
      <PageHeader
        title="Contenuti"
        subtitle="Coda editoriale di post, comunicati e grafiche della campagna"
        actions={<ContenutoFormDialog domain={domain} />}
      />
      <PageContent>
        <ContenutiClient contenuti={contenuti} domain={domain} />
      </PageContent>
    </PageLayout>
  );
}
