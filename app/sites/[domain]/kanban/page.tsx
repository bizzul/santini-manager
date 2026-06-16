import React from "react";
import { redirect } from "next/navigation";

import { getUserContext } from "@/lib/auth-utils";
import {
  requireServerSiteContext,
  fetchKanbanWithTasks,
  fetchSingleKanban,
  fetchKanbanDiagramBoards,
} from "@/lib/server-data";
import { PageLayout, PageHeader } from "@/components/page-layout";
import { KanbanPageClient } from "./kanban-page-client";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
  params,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
  params: Promise<{ domain: string }>;
}) {
  const resolvedParams = await params;
  const domain = resolvedParams.domain;
  const sp = await searchParams;
  const kanName = sp.name;
  const isDiagram = sp.view === "diagram";

  const userContext = await getUserContext();
  if (!userContext || !userContext.user) {
    return redirect("/login");
  }

  const siteContext = await requireServerSiteContext(domain);
  const { siteId } = siteContext;

  const [kanbanData, kanban, diagramBoards] = await Promise.all([
    fetchKanbanWithTasks(siteId, kanName),
    kanName ? fetchSingleKanban(siteId, kanName) : Promise.resolve(null),
    !kanName ? fetchKanbanDiagramBoards(siteId) : Promise.resolve([]),
  ]);

  return (
    <PageLayout>
      {isDiagram && !kanName ? (
        <PageHeader
          title="Kanban"
          subtitle="Bacheche organizzate per categoria"
        />
      ) : null}
      <KanbanPageClient
        kanName={kanName}
        domain={domain}
        siteId={siteId}
        diagramBoards={diagramBoards}
        clients={kanbanData.clients}
        products={kanbanData.products}
        categories={kanbanData.categories}
        history={kanbanData.history}
        initialTasks={kanbanData.tasks}
        kanban={kanban}
      />
    </PageLayout>
  );
}
