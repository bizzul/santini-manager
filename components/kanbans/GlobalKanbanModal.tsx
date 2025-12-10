"use client";

import React from "react";
import KanbanManagementModal from "./KanbanManagementModal";
import { useKanbanModal } from "./KanbanModalContext";
import { saveKanban } from "@/app/sites/[domain]/kanban/actions/save-kanban.action";
import { logger } from "@/lib/logger";

export function GlobalKanbanModal() {
  const { isCreateModalOpen, preSelectedCategoryId, closeCreateModal } =
    useKanbanModal();

  // Extract domain from window.location.pathname
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";
  const domainMatch = pathname.match(/\/sites\/([^\/]+)/);
  const domain = domainMatch ? domainMatch[1] : null;

  const handleSaveKanban = async (kanbanData: any) => {
    try {
      if (!domain) {
        throw new Error("Could not extract domain from path");
      }

      await saveKanban(kanbanData, domain);
      closeCreateModal();
      // Refresh the page to get the updated kanban data
      window.location.reload();
    } catch (error) {
      logger.error("Error saving kanban:", error);
    }
  };

  // Create a kanban object with pre-selected category if provided
  const preFilledKanban = preSelectedCategoryId
    ? {
        category_id: preSelectedCategoryId,
      }
    : null;

  return (
    <KanbanManagementModal
      kanban={preFilledKanban}
      onSave={handleSaveKanban}
      mode="create"
      hasTasks={false}
      open={isCreateModalOpen}
      onOpenChange={closeCreateModal}
      trigger={<div style={{ display: "none" }} />}
      preSelectedCategoryId={preSelectedCategoryId}
      domain={domain || undefined}
    />
  );
}
