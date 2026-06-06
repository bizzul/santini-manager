"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { extractCategoryImagePath } from "@/lib/category-image-constants";

export async function removeItem(
  data: { id: string },
  domain?: string,
) {
  if (!domain) {
    return { message: "Dominio sito mancante!" };
  }

  let siteId: string | null = null;

  try {
    const siteResult = await getSiteData(domain);
    siteId = siteResult?.data?.id ?? null;
  } catch (error) {
    console.error("Error fetching site data:", error);
  }

  if (!siteId) {
    return { message: "Sito non trovato!" };
  }

  try {
    const supabase = createServiceClient();

    const { data: itemsUsingCategory, error: checkError } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("category_id", data.id)
      .eq("site_id", siteId)
      .limit(1);

    if (checkError) {
      return { message: "Errore durante la verifica della categoria" };
    }

    if (itemsUsingCategory && itemsUsingCategory.length > 0) {
      return {
        message:
          "Impossibile eliminare la categoria perché è utilizzata da uno o più articoli.",
      };
    }

    const { data: categoryToDelete } = await supabase
      .from("inventory_categories")
      .select("image_url")
      .eq("id", data.id)
      .eq("site_id", siteId)
      .maybeSingle();

    const { error } = await supabase
      .from("inventory_categories")
      .delete()
      .eq("id", data.id)
      .eq("site_id", siteId);

    if (error) {
      console.error("Error deleting inventory category:", error);
      return { message: "Eliminazione elemento fallita!" };
    }

    if (categoryToDelete?.image_url) {
      const imagePath = extractCategoryImagePath(categoryToDelete.image_url);
      if (imagePath) {
        await supabase.storage.from("category-images").remove([imagePath]);
      }
    }

    revalidatePath(`/sites/${domain}/categories`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error deleting inventory category:", error);
    return { message };
  }
}
