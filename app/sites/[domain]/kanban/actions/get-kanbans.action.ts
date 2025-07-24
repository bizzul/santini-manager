"use server";

import { createClient } from "@/utils/supabase/server";

export async function getKanbans() {
  try {
    const supabase = await createClient();

    // Fetch all kanbans
    const { data: kanbans, error: kanbansError } = await supabase
      .from("Kanban")
      .select("*")
      .order("title", { ascending: true });

    if (kanbansError) {
      console.error("Error fetching kanbans:", kanbansError);
      throw new Error("Failed to fetch kanbans");
    }

    // For each kanban, fetch its columns
    const kanbansWithColumns = await Promise.all(
      kanbans.map(async (kanban) => {
        const { data: columns, error: columnsError } = await supabase
          .from("KanbanColumn")
          .select("*")
          .eq("kanbanId", kanban.id)
          .order("position", { ascending: true });

        if (columnsError) {
          console.error(
            "Error fetching columns for kanban:",
            kanban.id,
            columnsError,
          );
          throw new Error(`Failed to fetch columns for kanban ${kanban.id}`);
        }

        return {
          ...kanban,
          columns: columns || [],
        };
      }),
    );

    return kanbansWithColumns;
  } catch (error) {
    console.error("Error fetching kanbans:", error);
    throw new Error("Failed to fetch kanbans");
  }
}
