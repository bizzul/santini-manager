"use server";

import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { revalidatePath } from "next/cache";

export async function deleteKanbanCategory(
  categoryId: number,
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

    // Check if there are kanbans using this category
    const { data: kanbansWithCategory, error: checkError } = await supabase
      .from("Kanban")
      .select("id")
      .eq("category_id", categoryId)
      .limit(1);

    if (checkError) {
      console.error("Error checking kanbans:", checkError);
      throw new Error("Failed to check if category is in use");
    }

    if (kanbansWithCategory && kanbansWithCategory.length > 0) {
      return {
        success: false,
        error:
          "Cannot delete category because it's being used by one or more kanbans. Please reassign or delete those kanbans first.",
      };
    }

    // Delete the category
    const { error } = await supabase
      .from("KanbanCategory")
      .delete()
      .eq("id", categoryId)
      .eq("site_id", siteId);

    if (error) {
      console.error("Error deleting category:", error);
      throw new Error("Failed to delete category");
    }

    // Revalidate relevant paths
    revalidatePath(`/sites/${domain}/kanban`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting kanban category:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete category",
    };
  }
}

