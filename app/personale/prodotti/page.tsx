import { ShoppingBag } from "lucide-react";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";
import { SpaceChip } from "@/components/personale/space-chip";
import { SpaceFilter } from "@/components/personale/space-filter";
import {
  getAggregateContext,
  getAggregateProducts,
} from "@/lib/personale/aggregate";

export const dynamic = "force-dynamic";

export default async function PersonaleProdottiPage({
  searchParams,
}: {
  searchParams: Promise<{ spazi?: string }>;
}) {
  const { spazi } = await searchParams;
  const ctx = await getAggregateContext(spazi);
  const products = await getAggregateProducts(ctx.selectedSiteIds);

  return (
    <PageLayout>
      <PageHeader
        title="Prodotti"
        subtitle="Catalogo prodotti aggregato dai tuoi spazi"
        actions={<SpaceFilter sites={ctx.sites} />}
      />
      <PageContent>
        {products.length > 0 ? (
          <div className="rounded-lg border bg-card shadow-sm">
            <ul className="divide-y divide-border">
              {products.map((product) => (
                <li
                  key={`${product.site_id}-${product.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {product.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        product.internal_code,
                        product.type,
                        typeof product.list_price === "number"
                          ? `CHF ${product.list_price.toFixed(2)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <SpaceChip
                    site={ctx.siteById.get(product.site_id)}
                    section="products"
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState
            icon={<ShoppingBag className="h-6 w-6" />}
            title="Nessun prodotto"
            description="Non ci sono prodotti attivi negli spazi selezionati."
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
