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
  kanban,
  domain,
}: {
  kanName: string;
  clients: any;
  products: any;
  categories: any;
  history: any;
  initialTasks?: any[];
  kanban: any;
  domain: string;
}) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <KanbanBoard
        name={kanName}
        clients={clients}
        products={products}
        categories={categories}
        history={history}
        initialTasks={initialTasks}
        kanban={kanban}
        domain={domain}
      />
    </div>
  );
}

export default ContentPage;
