"use server";

import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";

export async function getKanbans(domain?: string) {
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

    // Fetch kanbans filtered by site_id if available
    let kanbanQuery = supabase
      .from("Kanban")
      .select("*")
      .order("title", { ascending: true });

    if (siteId) {
      kanbanQuery = kanbanQuery.eq("site_id", siteId);
    }

    const { data: kanbans, error: kanbansError } = await kanbanQuery;

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
