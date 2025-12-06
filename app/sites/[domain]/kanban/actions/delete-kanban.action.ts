"use server";

import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";

export async function deleteKanban(kanbanId: number, domain?: string) {
    try {
        const supabase = await createClient();
        let siteId = null;

        // Get site information
        if (domain) {
            try {
                const siteResult = await getSiteData(domain);
                if (siteResult?.data) {
                    siteId = siteResult.data.id;
                }
            } catch (error) {
                console.error("Error fetching site data:", error);
            }
        }

        // First, check if the kanban exists and belongs to the correct site
        let kanbanQuery = supabase
            .from("Kanban")
            .select("*")
            .eq("id", kanbanId);

        if (siteId) {
            kanbanQuery = kanbanQuery.eq("site_id", siteId);
        }

        const { data: kanban, error: kanbanError } = await kanbanQuery.single();

        if (kanbanError) {
            console.error("Error fetching kanban:", kanbanError);
            return {
                success: false,
                error: "Kanban non trovato o non hai i permessi per eliminarlo"
            };
        }

        if (!kanban) {
            return {
                success: false,
                error: "Kanban non trovato"
            };
        }

        console.log(`🗑️  Starting deletion process for kanban ${kanbanId}...`);

        // STEP 1: Disconnect tasks from kanban (set kanbanId to NULL)
        const { data: disconnectedFromKanban, error: disconnectKanbanError } = await supabase
            .from("Task")
            .update({ kanbanId: null })
            .eq("kanbanId", kanbanId)
            .select("id");

        if (disconnectKanbanError) {
            console.error("Error disconnecting tasks from kanban:", disconnectKanbanError);
            return {
                success: false,
                error: "Errore durante lo scollegamento delle task dal kanban"
            };
        }

        const tasksDisconnectedCount = disconnectedFromKanban?.length || 0;
        console.log(`✓ Disconnected ${tasksDisconnectedCount} task(s) from kanban`);

        // STEP 2: Get all columns for this kanban
        const { data: columns, error: columnsError } = await supabase
            .from("KanbanColumn")
            .select("id")
            .eq("kanbanId", kanbanId);

        if (columnsError) {
            console.error("Error fetching columns:", columnsError);
            return {
                success: false,
                error: "Errore durante il recupero delle colonne del kanban"
            };
        }

        let columnTasksDisconnectedCount = 0;

        // STEP 3: Disconnect tasks from columns (set kanbanColumnId to NULL)
        if (columns && columns.length > 0) {
            const columnIds = columns.map(col => col.id);
            console.log(`Found ${columnIds.length} columns to process`);

            const { data: disconnectedFromColumns, error: disconnectColumnsError } = await supabase
                .from("Task")
                .update({ kanbanColumnId: null })
                .in("kanbanColumnId", columnIds)
                .select("id");

            if (disconnectColumnsError) {
                console.error("Error disconnecting tasks from columns:", disconnectColumnsError);
                return {
                    success: false,
                    error: "Errore durante lo scollegamento delle task dalle colonne"
                };
            }

            columnTasksDisconnectedCount = disconnectedFromColumns?.length || 0;
            console.log(`✓ Disconnected ${columnTasksDisconnectedCount} task(s) from columns`);
        }

        // STEP 4: Delete kanban columns (now safe since tasks are disconnected)
        const { error: columnsDeleteError } = await supabase
            .from("KanbanColumn")
            .delete()
            .eq("kanbanId", kanbanId);

        if (columnsDeleteError) {
            console.error("Error deleting kanban columns:", columnsDeleteError);
            return {
                success: false,
                error: "Errore durante l'eliminazione delle colonne del kanban"
            };
        }

        console.log(`✓ Deleted ${columns?.length || 0} column(s)`);

        // STEP 5: Delete the kanban itself
        const { error: deleteError } = await supabase
            .from("Kanban")
            .delete()
            .eq("id", kanbanId);

        if (deleteError) {
            console.error("Error deleting kanban:", deleteError);
            return {
                success: false,
                error: "Errore durante l'eliminazione del kanban"
            };
        }

        console.log(`✓ Kanban ${kanbanId} deleted successfully`);

        const totalTasksDisconnected = tasksDisconnectedCount + columnTasksDisconnectedCount;

        return {
            success: true,
            tasksDisconnected: totalTasksDisconnected
        };

    } catch (error) {
        console.error("Error deleting kanban:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Errore sconosciuto durante l'eliminazione"
        };
    }
}
