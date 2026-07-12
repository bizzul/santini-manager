import { Tags } from "lucide-react";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";
import { SpaceChip } from "@/components/personale/space-chip";
import { SpaceFilter } from "@/components/personale/space-filter";
import {
  getAggregateContext,
  getAggregateCategories,
  type CategoryKind,
} from "@/lib/personale/aggregate";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<CategoryKind, string> = {
  inventario: "Inventario",
  prodotti: "Prodotti",
  fornitori: "Fornitori",
  produttori: "Produttori",
};

export default async function PersonaleCategoriePage({
  searchParams,
}: {
  searchParams: Promise<{ spazi?: string }>;
}) {
  const { spazi } = await searchParams;
  const ctx = await getAggregateContext(spazi);
  const categories = await getAggregateCategories(ctx.selectedSiteIds);

  return (
    <PageLayout>
      <PageHeader
        title="Categorie"
        subtitle="Inventario, prodotti, fornitori e produttori"
        actions={<SpaceFilter sites={ctx.sites} />}
      />
      <PageContent>
        {categories.length > 0 ? (
          <div className="rounded-lg border bg-card shadow-sm">
            <ul className="divide-y divide-border">
              {categories.map((category) => (
                <li
                  key={`${category.site_id}-${category.key}`}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {category.name}
                      </p>
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {KIND_LABELS[category.kind]}
                      </span>
                    </div>
                    {category.description ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {category.description}
                      </p>
                    ) : null}
                  </div>
                  <SpaceChip
                    site={ctx.siteById.get(category.site_id)}
                    section={category.section}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState
            icon={<Tags className="h-6 w-6" />}
            title="Nessuna categoria"
            description="Non ci sono categorie negli spazi selezionati."
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
