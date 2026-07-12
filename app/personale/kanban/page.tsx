import { SquareKanban } from "lucide-react";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";
import { SpaceChip } from "@/components/personale/space-chip";
import { SpaceFilter } from "@/components/personale/space-filter";
import {
  getAggregateContext,
  getAggregateTasks,
} from "@/lib/personale/aggregate";

export const dynamic = "force-dynamic";

export default async function PersonaleKanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ spazi?: string }>;
}) {
  const { spazi } = await searchParams;
  const ctx = await getAggregateContext(spazi);
  const tasks = await getAggregateTasks(ctx.selectedSiteIds);

  return (
    <PageLayout>
      <PageHeader
        title="Kanban"
        subtitle="Le card di tutti i tuoi spazi, in un'unica vista"
        actions={<SpaceFilter sites={ctx.sites} />}
      />
      <PageContent>
        {tasks.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tasks.map((task) => (
              <div
                key={`${task.site_id}-${task.id}`}
                className="rounded-lg border bg-card p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-medium text-foreground">
                    {task.title || task.unique_code || `Task #${task.id}`}
                  </p>
                  {task.task_type ? (
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {task.task_type}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  {task.unique_code ? <span>{task.unique_code}</span> : null}
                  {task.status ? (
                    <span className="rounded bg-muted px-1.5 py-0.5">
                      {task.status}
                    </span>
                  ) : null}
                  {task.deliveryDate ? (
                    <span>
                      {new Date(task.deliveryDate).toLocaleDateString("it-IT")}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2">
                  <SpaceChip site={ctx.siteById.get(task.site_id)} section="kanban" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<SquareKanban className="h-6 w-6" />}
            title="Nessuna card"
            description="Non ci sono card attive negli spazi selezionati."
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
