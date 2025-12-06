"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";

export async function saveKanban(kanban: {
  id?: number;
  title: string;
  identifier: string;
  color?: string;
  category_id?: number | null;
  columns: {
    id?: number;
    title: string;
    identifier: string;
    position: number;
    icon?: string;
  }[];
  skipColumnUpdates?: boolean; // Flag per saltare l'aggiornamento delle colonne
}, domain?: string) {
  let siteId = null;
  let organizationId = null;

  // Get site information
  if (domain) {
    try {
      const siteResult = await getSiteData(domain);
      if (siteResult?.data) {
        siteId = siteResult.data.id;
        organizationId = siteResult.data.organization_id;
      }
    } catch (error) {
      console.error("Error fetching site data:", error);
    }
  }

  try {
    const supabase = await createClient();

    // Start a transaction-like operation using Supabase
    // First, check if kanban exists (filter by site_id if available)
    let kanbanQuery = supabase
      .from("Kanban")
      .select("*")
      .eq("identifier", kanban.identifier);

    if (siteId) {
      kanbanQuery = kanbanQuery.eq("site_id", siteId);
    }

    const { data: existingKanban, error: fetchError } = await kanbanQuery
      .single();

    if (fetchError && fetchError.code !== "PGRST116") { // PGRST116 is "not found" error
      console.error("Error fetching existing kanban:", fetchError);
      throw new Error("Failed to fetch existing kanban");
    }

    let kanbanResult;
    if (existingKanban) {
      // Update existing kanban
      const updateData: any = {
        title: kanban.title,
        color: kanban.color,
        category_id: kanban.category_id,
      };

      if (siteId) {
        updateData.site_id = siteId;
      }

      const { data: updatedKanban, error: updateError } = await supabase
        .from("Kanban")
        .update(updateData)
        .eq("identifier", kanban.identifier)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating kanban:", updateError);
        console.error("Update data:", updateData);
        console.error("Kanban identifier:", kanban.identifier);
        throw new Error(`Failed to update kanban: ${updateError.message || updateError.code || 'Unknown error'}`);
      }

      kanbanResult = updatedKanban;
    } else {
      // Create new kanban
      const insertData: any = {
        title: kanban.title,
        identifier: kanban.identifier,
        color: kanban.color,
        category_id: kanban.category_id,
      };

      if (siteId) {
        insertData.site_id = siteId;
      }

      const { data: newKanban, error: createError } = await supabase
        .from("Kanban")
        .insert(insertData)
        .select()
        .single();

      if (createError) {
        console.error("Error creating kanban:", createError);
        console.error("Insert data:", insertData);
        throw new Error(`Failed to create kanban: ${createError.message || createError.code || 'Unknown error'}`);
      }

      kanbanResult = newKanban;
    }

    // Skip column updates if flag is set (when editing metadata only)
    if (kanban.skipColumnUpdates) {
      console.log("⏭️  Skipping column updates (metadata-only update)");
      
      // Just return the kanban with existing columns
      const { data: existingColumns } = await supabase
        .from("KanbanColumn")
        .select("*")
        .eq("kanbanId", kanbanResult.id)
        .order("position");

      const result = {
        ...kanbanResult,
        columns: existingColumns || [],
      };

      revalidatePath("/kanban");
      revalidatePath("/");
      revalidateTag("kanbans");

      return result;
    }

    // Get existing columns
    const { data: existingColumns, error: columnsError } = await supabase
      .from("KanbanColumn")
      .select("*")
      .eq("kanbanId", kanbanResult.id);

    if (columnsError) {
      console.error("Error fetching existing columns:", columnsError);
      console.error("Kanban ID:", kanbanResult?.id);
      throw new Error(`Failed to fetch existing columns: ${columnsError.message || columnsError.code || 'Unknown error'}`);
    }

    // Delete columns that are no longer present
    const columnsToDelete = existingColumns?.filter(
      (existing) => !kanban.columns.some((col) => col.id === existing.id),
    ) || [];

    if (columnsToDelete.length > 0) {
      // Check if any of the columns to delete have tasks associated
      const columnsWithTasks = await supabase
        .from("Task")
        .select("kanbanColumnId")
        .in("kanbanColumnId", columnsToDelete.map((col) => col.id))
        .limit(1);

      if (columnsWithTasks.data && columnsWithTasks.data.length > 0) {
        console.error("Cannot delete columns with associated tasks");
        throw new Error(
          "Cannot delete columns that have tasks. Please move or delete the tasks first, or keep all existing columns when editing the kanban."
        );
      }

      const { error: deleteError } = await supabase
        .from("KanbanColumn")
        .delete()
        .in("id", columnsToDelete.map((col) => col.id));

      if (deleteError) {
        console.error("Error deleting columns:", deleteError);
        throw new Error(`Failed to delete columns: ${deleteError.message || deleteError.code}`);
      }
    }

    // Update or create columns
    const columnPromises = kanban.columns.map(async (column) => {
      if (column.id && column.id > 0) {
        // Update existing column
        const { data: updatedColumn, error: updateError } = await supabase
          .from("KanbanColumn")
          .update({
            title: column.title,
            position: column.position,
            icon: column.icon,
          })
          .eq("id", column.id)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating column:", updateError);
          throw new Error(`Failed to update column: ${column.title}`);
        }

        return updatedColumn;
      } else {
        // Create new column
        const { data: newColumn, error: createError } = await supabase
          .from("KanbanColumn")
          .insert({
            title: column.title,
            identifier: column.identifier,
            position: column.position,
            icon: column.icon,
            kanbanId: kanbanResult.id,
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating column:", createError);
          throw new Error(`Failed to create column: ${column.title}`);
        }

        return newColumn;
      }
    });

    const columns = await Promise.all(columnPromises);

    const result = {
      ...kanbanResult,
      columns,
    };

    // Comprehensive revalidation
    revalidatePath("/kanban");
    revalidatePath("/");
    revalidateTag("kanbans");

    return result;
  } catch (error) {
    console.error("Error saving kanban:", error);
    // Preserve the original error message for better debugging
    const errorMessage = error instanceof Error ? error.message : "Failed to save kanban";
    throw new Error(errorMessage);
  }
}
