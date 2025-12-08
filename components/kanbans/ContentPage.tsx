"use client";
import React from "react";
import KanbanBoard from "../kanbans/KanbanBoard";

function ContentPage({
  kanName,
  clients,
  products,
  history,
  initialTasks,
  snapshots,
  kanban,
  domain,
}: {
  kanName: string;
  clients: any;
  products: any;
  history: any;
  initialTasks?: any[];
  snapshots: any[];
  kanban: any;
  domain: string;
}) {
  return (
    <div className="w-auto h-auto">
      <div className="mx-auto mt-2 w-auto h-auto">
        <KanbanBoard
          name={kanName}
          clients={clients}
          products={products}
          history={history}
          initialTasks={initialTasks}
          kanban={kanban}
          snapshots={snapshots}
          domain={domain}
        />
      </div>
    </div>
  );
}

export default ContentPage;
