"use client";

import React from "react";
import KanbanManagementModal from "./KanbanManagementModal";
import { useKanbanModal } from "./KanbanModalContext";
import { saveKanban } from "@/app/sites/[domain]/kanban/actions/save-kanban.action";
import { logger } from "@/lib/logger";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

export function GlobalKanbanModal() {
  const { isCreateModalOpen, preSelectedCategoryId, closeCreateModal } =
    useKanbanModal();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

      // Invalidate cache so sidebar and other components update immediately
      // This is better than window.location.reload() - faster and smoother UX
      queryClient.invalidateQueries({ queryKey: ["kanbans-list"] });
      queryClient.invalidateQueries({ queryKey: ["kanban-categories"] });
      queryClient.invalidateQueries({ queryKey: ["kanbans"] });

      toast({
        title: "Kanban creato",
        description: "La kanban è stata creata con successo",
      });
    } catch (error) {
      logger.error("Error saving kanban:", error);
      toast({
        title: "Errore",
        description: "Impossibile creare la kanban",
        variant: "destructive",
      });
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
