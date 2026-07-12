import { Warehouse } from "lucide-react";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";
import { SpaceChip } from "@/components/personale/space-chip";
import { SpaceFilter } from "@/components/personale/space-filter";
import {
  getAggregateContext,
  getAggregateInventoryItems,
} from "@/lib/personale/aggregate";

export const dynamic = "force-dynamic";

export default async function PersonaleMagazzinoPage({
  searchParams,
}: {
  searchParams: Promise<{ spazi?: string }>;
}) {
  const { spazi } = await searchParams;
  const ctx = await getAggregateContext(spazi);
  const items = await getAggregateInventoryItems(ctx.selectedSiteIds);

  return (
    <PageLayout>
      <PageHeader
        title="Magazzino"
        subtitle="Articoli inventario aggregati dai tuoi spazi"
        actions={<SpaceFilter sites={ctx.sites} />}
      />
      <PageContent>
        {items.length > 0 ? (
          <div className="rounded-lg border bg-card shadow-sm">
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li
                  key={`${item.site_id}-${item.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[item.item_type, item.description]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <SpaceChip
                    site={ctx.siteById.get(item.site_id)}
                    section="inventory"
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState
            icon={<Warehouse className="h-6 w-6" />}
            title="Nessun articolo"
            description="Non ci sono articoli attivi negli spazi selezionati."
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
