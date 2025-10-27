"use server";

import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { redirect } from "next/navigation";

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
            throw new Error(
                "Kanban non trovato o non hai i permessi per eliminarlo",
            );
        }

        if (!kanban) {
            throw new Error("Kanban non trovato");
        }

        // Check if kanban has tasks
        const { data: tasks, error: tasksError } = await supabase
            .from("Task")
            .select("id")
            .eq("kanbanId", kanbanId);

        if (tasksError) {
            console.error("Error checking tasks:", tasksError);
            throw new Error("Errore durante la verifica dei task associati");
        }

        if (tasks && tasks.length > 0) {
            throw new Error(
                "Impossibile eliminare il kanban: contiene task associati. Elimina prima tutti i task.",
            );
        }

        // Delete kanban columns first (due to foreign key constraints)
        const { error: columnsDeleteError } = await supabase
            .from("KanbanColumn")
            .delete()
            .eq("kanbanId", kanbanId);

        if (columnsDeleteError) {
            console.error("Error deleting kanban columns:", columnsDeleteError);
            throw new Error(
                "Errore durante l'eliminazione delle colonne del kanban",
            );
        }

        // Delete the kanban
        const { error: deleteError } = await supabase
            .from("Kanban")
            .delete()
            .eq("id", kanbanId);

        if (deleteError) {
            console.error("Error deleting kanban:", deleteError);
            throw new Error("Errore durante l'eliminazione del kanban");
        }

        // Redirect to kanban list page
        if (domain) {
            redirect(`/sites/${domain}/kanban`);
        } else {
            redirect("/kanban");
        }
    } catch (error) {
        console.error("Error deleting kanban:", error);
        throw error;
    }
}
