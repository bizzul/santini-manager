"use server";

import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";

export interface KanbanCategory {
  id: number;
  name: string;
  identifier: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  display_order: number;
  site_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function getKanbanCategories(
  domain?: string
): Promise<KanbanCategory[]> {
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

    let query = supabase
      .from("KanbanCategory")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (siteId) {
      query = query.eq("site_id", siteId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching kanban categories:", error);
      throw new Error("Failed to fetch kanban categories");
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching kanban categories:", error);
    throw new Error("Failed to fetch kanban categories");
  }
}

