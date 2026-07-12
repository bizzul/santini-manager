import { Contact } from "lucide-react";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";
import { SpaceChip } from "@/components/personale/space-chip";
import { SpaceFilter } from "@/components/personale/space-filter";
import {
  getAggregateContext,
  getAggregateContacts,
  type ContactKind,
} from "@/lib/personale/aggregate";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<ContactKind, string> = {
  cliente: "Cliente",
  fornitore: "Fornitore",
  produttore: "Produttore",
};

export default async function PersonaleContattiPage({
  searchParams,
}: {
  searchParams: Promise<{ spazi?: string }>;
}) {
  const { spazi } = await searchParams;
  const ctx = await getAggregateContext(spazi);
  const contacts = await getAggregateContacts(ctx.selectedSiteIds);

  return (
    <PageLayout>
      <PageHeader
        title="Contatti"
        subtitle="Clienti, fornitori e produttori di tutti i tuoi spazi"
        actions={<SpaceFilter sites={ctx.sites} />}
      />
      <PageContent>
        {contacts.length > 0 ? (
          <div className="rounded-lg border bg-card shadow-sm">
            <ul className="divide-y divide-border">
              {contacts.map((contact) => (
                <li
                  key={`${contact.site_id}-${contact.key}`}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {contact.name}
                      </p>
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {KIND_LABELS[contact.kind]}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {[contact.email, contact.phone].filter(Boolean).join(" · ") ||
                        "—"}
                    </p>
                  </div>
                  <SpaceChip
                    site={ctx.siteById.get(contact.site_id)}
                    section={contact.section}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState
            icon={<Contact className="h-6 w-6" />}
            title="Nessun contatto"
            description="Non ci sono contatti negli spazi selezionati."
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
