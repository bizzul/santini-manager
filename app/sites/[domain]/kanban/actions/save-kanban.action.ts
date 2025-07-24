"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function saveKanban(kanban: {
  title: string;
  identifier: string;
  color?: string;
  columns: {
    id?: number;
    title: string;
    identifier: string;
    position: number;
    icon?: string;
  }[];
}) {
  console.log("Starting saveKanban with data:", {
    title: kanban.title,
    identifier: kanban.identifier,
    columnCount: kanban.columns.length,
  });

  try {
    const supabase = await createClient();

    // Start a transaction-like operation using Supabase
    // First, check if kanban exists
    const { data: existingKanban, error: fetchError } = await supabase
      .from("Kanban")
      .select("*")
      .eq("identifier", kanban.identifier)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") { // PGRST116 is "not found" error
      console.error("Error fetching existing kanban:", fetchError);
      throw new Error("Failed to fetch existing kanban");
    }

    let kanbanResult;
    if (existingKanban) {
      // Update existing kanban
      const { data: updatedKanban, error: updateError } = await supabase
        .from("Kanban")
        .update({
          title: kanban.title,
          color: kanban.color,
        })
        .eq("identifier", kanban.identifier)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating kanban:", updateError);
        throw new Error("Failed to update kanban");
      }

      kanbanResult = updatedKanban;
    } else {
      // Create new kanban
      const { data: newKanban, error: createError } = await supabase
        .from("Kanban")
        .insert({
          title: kanban.title,
          identifier: kanban.identifier,
          color: kanban.color,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating kanban:", createError);
        throw new Error("Failed to create kanban");
      }

      kanbanResult = newKanban;
    }

    console.log("Kanban saved with ID:", kanbanResult.id);

    // Get existing columns
    const { data: existingColumns, error: columnsError } = await supabase
      .from("KanbanColumn")
      .select("*")
      .eq("kanbanId", kanbanResult.id);

    if (columnsError) {
      console.error("Error fetching existing columns:", columnsError);
      throw new Error("Failed to fetch existing columns");
    }

    console.log("Found existing columns:", existingColumns?.length || 0);

    // Delete columns that are no longer present
    const columnsToDelete = existingColumns?.filter(
      (existing) => !kanban.columns.some((col) => col.id === existing.id),
    ) || [];

    if (columnsToDelete.length > 0) {
      console.log(
        "Deleting columns:",
        columnsToDelete.map((col) => col.id),
      );

      const { error: deleteError } = await supabase
        .from("KanbanColumn")
        .delete()
        .in("id", columnsToDelete.map((col) => col.id));

      if (deleteError) {
        console.error("Error deleting columns:", deleteError);
        throw new Error("Failed to delete columns");
      }
    }

    // Update or create columns
    const columnPromises = kanban.columns.map(async (column) => {
      console.log("Processing column:", column.title, column.identifier);

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
    console.log("All columns processed:", columns.length);

    const result = {
      ...kanbanResult,
      columns,
    };

    console.log("Transaction completed successfully");

    // Comprehensive revalidation
    revalidatePath("/kanban");
    revalidatePath("/");
    revalidateTag("kanbans");

    console.log("Revalidation completed");

    return result;
  } catch (error) {
    console.error("Error saving kanban:", error);
    throw new Error("Failed to save kanban");
  }
}
