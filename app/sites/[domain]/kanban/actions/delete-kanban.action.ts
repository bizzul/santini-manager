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

        // Check if kanban has non-archived tasks
        // Try both camelCase and snake_case field names in case of mapping issues
        let tasks: any[] | null = null;
        let tasksError: any = null;

        // Try with kanbanId first (camelCase)
        const tasksQuery1 = supabase
            .from("Task")
            .select("id")
            .eq("archived", false)
            .eq("kanbanId", kanbanId);
        
        const result1 = await tasksQuery1;
        tasks = result1.data;
        tasksError = result1.error;

        console.log("First query result:", { tasks, error: tasksError });

        // If that fails or returns no results, try with kanban_id (snake_case)
        if (tasksError) {
            console.log("First query failed, trying with kanban_id (snake_case)...");
            const tasksQuery2 = supabase
                .from("Task")
                .select("id")
                .eq("archived", false)
                .eq("kanban_id", kanbanId);
            
            const result2 = await tasksQuery2;
            tasks = result2.data;
            tasksError = result2.error;
            console.log("Second query result:", { tasks, error: tasksError });
        }

        // If both queries fail, try without archived filter
        if (tasksError) {
            console.log("Both queries failed, trying without archived filter...");
            const tasksQuery3 = supabase
                .from("Task")
                .select("id")
                .eq("kanbanId", kanbanId);
            
            const result3 = await tasksQuery3;
            if (!result3.error) {
                tasks = result3.data;
                tasksError = null;
                console.log("Third query (without archived filter) result:", { tasks });
            }
        }

        if (tasksError) {
            console.error("Error checking tasks:", tasksError);
            console.error("Tasks error details:", JSON.stringify(tasksError, null, 2));
            // Instead of throwing, just log and continue - maybe the constraint will catch it
            console.warn("Could not verify tasks, proceeding with deletion attempt");
        }

        console.log(`Found ${tasks?.length || 0} tasks for kanban ${kanbanId}`);
        console.log("Tasks found:", tasks);

        // Only block if we successfully found tasks
        if (!tasksError && tasks && tasks.length > 0) {
            throw new Error(
                "Impossibile eliminare il kanban: contiene task associati. Elimina prima tutti i task.",
            );
        }

        // Check if kanban columns have non-archived tasks
        const { data: columns, error: columnsError } = await supabase
            .from("KanbanColumn")
            .select("id")
            .eq("kanbanId", kanbanId);

        if (columnsError) {
            console.error("Error fetching columns:", columnsError);
            throw new Error("Errore durante la verifica delle colonne del kanban");
        }

        if (columns && columns.length > 0) {
            const columnIds = columns.map(col => col.id);
            console.log(`Checking tasks in ${columnIds.length} columns:`, columnIds);
            
            let tasksInColumns: any[] | null = null;
            let tasksInColumnsError: any = null;

            // Try with kanbanColumnId first (camelCase)
            const tasksInColumnsQuery1 = supabase
                .from("Task")
                .select("id")
                .eq("archived", false)
                .in("kanbanColumnId", columnIds);
            
            const result1 = await tasksInColumnsQuery1;
            tasksInColumns = result1.data;
            tasksInColumnsError = result1.error;

            console.log("First column query result:", { tasksInColumns, error: tasksInColumnsError });

            // If that fails, try with kanban_column_id (snake_case)
            if (tasksInColumnsError) {
                console.log("First column query failed, trying with kanban_column_id (snake_case)...");
                const tasksInColumnsQuery2 = supabase
                    .from("Task")
                    .select("id")
                    .eq("archived", false)
                    .in("kanban_column_id", columnIds);
                
                const result2 = await tasksInColumnsQuery2;
                tasksInColumns = result2.data;
                tasksInColumnsError = result2.error;
                console.log("Second column query result:", { tasksInColumns, error: tasksInColumnsError });
            }

            // If both queries fail, try without archived filter
            if (tasksInColumnsError) {
                console.log("Both column queries failed, trying without archived filter...");
                const tasksInColumnsQuery3 = supabase
                    .from("Task")
                    .select("id")
                    .in("kanbanColumnId", columnIds);
                
                const result3 = await tasksInColumnsQuery3;
                if (!result3.error) {
                    tasksInColumns = result3.data;
                    tasksInColumnsError = null;
                    console.log("Third column query (without archived filter) result:", { tasksInColumns });
                }
            }

            if (tasksInColumnsError) {
                console.error("Error checking tasks in columns:", tasksInColumnsError);
                console.error("Tasks in columns error details:", JSON.stringify(tasksInColumnsError, null, 2));
                // Instead of throwing, just log and continue - maybe the constraint will catch it
                console.warn("Could not verify tasks in columns, proceeding with deletion attempt");
            }

            console.log(`Found ${tasksInColumns?.length || 0} tasks in kanban columns`);
            console.log("Tasks in columns found:", tasksInColumns);

            // Only block if we successfully found tasks
            if (!tasksInColumnsError && tasksInColumns && tasksInColumns.length > 0) {
                throw new Error(
                    "Impossibile eliminare il kanban: contiene task associati alle colonne. Elimina prima tutti i task.",
                );
            }
        }

        // Delete kanban columns first (due to foreign key constraints)
        const { error: columnsDeleteError } = await supabase
            .from("KanbanColumn")
            .delete()
            .eq("kanbanId", kanbanId);

        if (columnsDeleteError) {
            console.error("Error deleting kanban columns:", columnsDeleteError);
            console.error("Columns delete error details:", JSON.stringify(columnsDeleteError, null, 2));
            
            // Check if it's a foreign key constraint error
            if (columnsDeleteError.code === "23503" || columnsDeleteError.message?.includes("foreign key")) {
                throw new Error(
                    "Impossibile eliminare il kanban: contiene task associati alle colonne. Elimina prima tutti i task.",
                );
            }
            
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
            console.error("Delete error details:", JSON.stringify(deleteError, null, 2));
            
            // Check if it's a foreign key constraint error
            if (deleteError.code === "23503" || deleteError.message?.includes("foreign key")) {
                throw new Error(
                    "Impossibile eliminare il kanban: contiene task associati. Elimina prima tutti i task.",
                );
            }
            
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
