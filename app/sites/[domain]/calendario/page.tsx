import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { requireCampagnaContext } from "@/lib/campagna/guard";
import { fetchEventi } from "@/lib/campagna/server-data";
import CalendarioClient from "@/components/campagna/CalendarioClient";
import EventoFormDialog from "@/components/campagna/EventoFormDialog";

export const metadata = { title: "Calendario" };

export default async function CalendarioPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const { siteId } = await requireCampagnaContext(domain);
  const eventi = await fetchEventi(siteId);

  return (
    <PageLayout>
      <PageHeader
        title="Calendario"
        subtitle="Eventi, comizi, pubblicazioni e scadenze legali della campagna"
        actions={<EventoFormDialog domain={domain} />}
      />
      <PageContent>
        <CalendarioClient eventi={eventi} domain={domain} />
      </PageContent>
    </PageLayout>
  );
}
