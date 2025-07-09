"use client";
import React from "react";
import { DndProvider } from "react-dnd-multi-backend";
import { HTML5toTouch } from "rdndmb-html5-to-touch";
import KanbanBoard from "../kanbans/KanbanBoard";

function ContentPage({
  kanName,
  clients,
  products,
  history,
  initialTasks,
  snapshots,
  kanban,
}: {
  kanName: string;
  clients: any;
  products: any;
  history: any;
  initialTasks?: any[];
  snapshots: any[];
  kanban: any;
}) {
  return (
    <div className="w-auto h-auto">
      <DndProvider options={HTML5toTouch}>
        <div className="mx-auto mt-2 w-auto h-auto">
          <KanbanBoard
            name={kanName}
            clients={clients}
            products={products}
            history={history}
            initialTasks={initialTasks}
            kanban={kanban}
            snapshots={snapshots}
          />
        </div>
      </DndProvider>
    </div>
  );
}

export default ContentPage;
