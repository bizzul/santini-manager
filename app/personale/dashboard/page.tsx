import { LayoutDashboard } from "lucide-react";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";
import { SpaceChip } from "@/components/personale/space-chip";
import { SpaceFilter } from "@/components/personale/space-filter";
import {
  getAggregateContext,
  getAggregateKpis,
} from "@/lib/personale/aggregate";

export const dynamic = "force-dynamic";

export default async function PersonaleDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ spazi?: string }>;
}) {
  const { spazi } = await searchParams;
  const ctx = await getAggregateContext(spazi);
  const kpis = await getAggregateKpis(ctx.selectedSites);

  const totals = kpis.reduce(
    (acc, k) => ({
      tasks: acc.tasks + k.tasks,
      clients: acc.clients + k.clients,
      inventoryItems: acc.inventoryItems + k.inventoryItems,
      products: acc.products + k.products,
    }),
    { tasks: 0, clients: 0, inventoryItems: 0, products: 0 },
  );

  const totalCards = [
    { label: "Card attive", value: totals.tasks },
    { label: "Clienti", value: totals.clients },
    { label: "Articoli inventario", value: totals.inventoryItems },
    { label: "Prodotti", value: totals.products },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Dashboard"
        subtitle="Cosa sta succedendo a te, in tutti i tuoi spazi"
        actions={<SpaceFilter sites={ctx.sites} />}
      />
      <PageContent>
        {kpis.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {totalCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-lg border bg-card p-4 shadow-sm"
                >
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-2xl font-extrabold text-foreground">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">
                  Dettaglio per spazio
                </p>
              </div>
              <ul className="divide-y divide-border">
                {kpis.map((kpi) => (
                  <li
                    key={kpi.site.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <SpaceChip site={kpi.site} section="dashboard" />
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        <strong className="text-foreground">{kpi.tasks}</strong>{" "}
                        card
                      </span>
                      <span>
                        <strong className="text-foreground">{kpi.clients}</strong>{" "}
                        clienti
                      </span>
                      <span>
                        <strong className="text-foreground">
                          {kpi.inventoryItems}
                        </strong>{" "}
                        articoli
                      </span>
                      <span>
                        <strong className="text-foreground">
                          {kpi.products}
                        </strong>{" "}
                        prodotti
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<LayoutDashboard className="h-6 w-6" />}
            title="Nessuno spazio selezionato"
            description="Seleziona almeno uno spazio dal filtro in alto."
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
