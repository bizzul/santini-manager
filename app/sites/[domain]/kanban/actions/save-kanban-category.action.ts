"use server";

import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { revalidatePath } from "next/cache";

export interface KanbanCategoryInput {
  id?: number;
  name: string;
  identifier: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  display_order?: number;
}

export async function saveKanbanCategory(
  category: KanbanCategoryInput,
  domain?: string
) {
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
        throw new Error("Failed to fetch site data");
      }
    }

    if (!siteId) {
      throw new Error("Site ID is required");
    }

    // Check if identifier already exists for this site (excluding current category if updating)
    const identifierCheck = supabase
      .from("KanbanCategory")
      .select("id")
      .eq("site_id", siteId)
      .eq("identifier", category.identifier);

    if (category.id) {
      identifierCheck.neq("id", category.id);
    }

    const { data: existing } = await identifierCheck.single();

    if (existing) {
      throw new Error(
        "A category with this identifier already exists for this site"
      );
    }

    const categoryData = {
      name: category.name,
      identifier: category.identifier,
      description: category.description,
      icon: category.icon,
      color: category.color,
      display_order: category.display_order ?? 0,
      site_id: siteId,
    };

    let result;

    if (category.id) {
      // Update existing category
      const { data, error } = await supabase
        .from("KanbanCategory")
        .update(categoryData)
        .eq("id", category.id)
        .eq("site_id", siteId)
        .select()
        .single();

      if (error) {
        console.error("Error updating category:", error);
        throw new Error("Failed to update category");
      }

      result = data;
    } else {
      // Create new category
      const { data, error } = await supabase
        .from("KanbanCategory")
        .insert(categoryData)
        .select()
        .single();

      if (error) {
        console.error("Error creating category:", error);
        throw new Error("Failed to create category");
      }

      result = data;
    }

    // Revalidate relevant paths
    revalidatePath(`/sites/${domain}/kanban`);

    return { success: true, data: result };
  } catch (error) {
    console.error("Error saving kanban category:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to save category",
    };
  }
}

