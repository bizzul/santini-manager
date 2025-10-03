"use client";

import React from "react";
import KanbanManagementModal from "./KanbanManagementModal";
import { useKanbanModal } from "./KanbanModalContext";
import { saveKanban } from "@/app/sites/[domain]/kanban/actions/save-kanban.action";

export function GlobalKanbanModal() {
  const { isCreateModalOpen, closeCreateModal } = useKanbanModal();

  const handleSaveKanban = async (kanbanData: any) => {
    try {
      // Extract domain from window.location.pathname
      const pathname = window.location.pathname;
      const domainMatch = pathname.match(/\/sites\/([^\/]+)/);
      const domain = domainMatch ? domainMatch[1] : null;

      if (!domain) {
        throw new Error("Could not extract domain from path");
      }

      await saveKanban(kanbanData, domain);
      closeCreateModal();
      // Refresh the page to get the updated kanban data
      window.location.reload();
    } catch (error) {
      console.error("Error saving kanban:", error);
    }
  };

  return (
    <KanbanManagementModal
      kanban={null}
      onSave={handleSaveKanban}
      mode="create"
      hasTasks={false}
      open={isCreateModalOpen}
      onOpenChange={closeCreateModal}
      trigger={<div style={{ display: "none" }} />}
    />
  );
}
