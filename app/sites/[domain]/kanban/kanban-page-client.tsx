"use client";

import React from "react";
import ContentPage from "@/components/kanbans/ContentPage";
import { KanbanDiagramView } from "@/components/diagram/kanban-diagram-view";
import type { KanbanDiagramBoard } from "@/components/diagram/kanban-diagram-view";
import { DiagramViewToolbar } from "@/components/diagram/diagram-view-toolbar";
import { useDiagramFocus } from "@/components/diagram/use-diagram-focus";

interface KanbanPageClientProps {
  kanName?: string;
  domain: string;
  siteId?: string;
  diagramBoards: KanbanDiagramBoard[];
  clients: any;
  products: any;
  categories: any;
  history: any;
  initialTasks?: any[];
  kanban: any;
}

export function KanbanPageClient({
  kanName,
  domain,
  siteId,
  diagramBoards,
  clients,
  products,
  categories,
  history,
  initialTasks,
  kanban,
}: KanbanPageClientProps) {
  const { isDiagram, setView } = useDiagramFocus();
  const showDiagram = isDiagram && !kanName;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showDiagram ? (
        <div className="shrink-0 border-b px-4 py-3 md:px-6 lg:px-8">
          <DiagramViewToolbar
            domain={domain}
            value="diagram"
            onChange={(mode) =>
              setView(mode === "diagram" ? "diagram" : "table")
            }
          />
        </div>
      ) : null}

      {showDiagram ? (
        <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <KanbanDiagramView
            boards={diagramBoards}
            domain={domain}
            siteId={siteId}
          />
        </div>
      ) : (
        <ContentPage
          kanName={kanName!}
          clients={clients}
          products={products}
          categories={categories}
          history={history}
          initialTasks={initialTasks}
          kanban={kanban}
          domain={domain}
        />
      )}
    </div>
  );
}
