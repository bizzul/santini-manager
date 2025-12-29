"use client";
import React from "react";
import KanbanBoard from "../kanbans/KanbanBoard";

function ContentPage({
  kanName,
  clients,
  products,
  categories,
  history,
  initialTasks,
  snapshots,
  kanban,
  domain,
}: {
  kanName: string;
  clients: any;
  products: any;
  categories: any;
  history: any;
  initialTasks?: any[];
  snapshots: any[];
  kanban: any;
  domain: string;
}) {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <KanbanBoard
        name={kanName}
        clients={clients}
        products={products}
        categories={categories}
        history={history}
        initialTasks={initialTasks}
        kanban={kanban}
        snapshots={snapshots}
        domain={domain}
      />
    </div>
  );
}

export default ContentPage;
