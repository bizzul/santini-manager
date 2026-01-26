"use server";

import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";

interface GetKanbansOptions {
  domain?: string;
  siteId?: string;
}

export async function getKanbans(options?: string | GetKanbansOptions) {
  try {
    const supabase = await createClient();
    let siteId: string | null = null;

    // Handle both legacy string parameter (domain) and new options object
    if (typeof options === "string") {
      // Legacy: options is domain string
      const domain = options;
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
    } else if (options) {
      // New: options is an object with domain and/or siteId
      if (options.siteId) {
        siteId = options.siteId;
      } else if (options.domain) {
        try {
          const siteResult = await getSiteData(options.domain);
          if (siteResult?.data) {
            siteId = siteResult.data.id;
          }
        } catch (error) {
          console.error("Error fetching site data:", error);
        }
      }
    }

    // OPTIMIZED: Single query with JOIN to get kanbans, columns, and category together
    // This eliminates N+1 query problem (was: 1 query for kanbans + N queries for columns)
    let kanbanQuery = supabase
      .from("Kanban")
      .select(`
        *,
        columns:KanbanColumn(*),
        category:KanbanCategory(*)
      `)
      .order("title", { ascending: true })
      .order("position", { referencedTable: "KanbanColumn", ascending: true });

    if (siteId) {
      kanbanQuery = kanbanQuery.eq("site_id", siteId);
    }

    const { data: kanbans, error: kanbansError } = await kanbanQuery;

    if (kanbansError) {
      console.error("Error fetching kanbans:", kanbansError);
      throw new Error("Failed to fetch kanbans");
    }

    return kanbans || [];
  } catch (error) {
    console.error("Error fetching kanbans:", error);
    throw new Error("Failed to fetch kanbans");
  }
}
