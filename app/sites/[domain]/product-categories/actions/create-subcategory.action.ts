"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";
import { validation } from "@/validation/sellProductSubcategory/create";
import { getSiteData } from "@/lib/fetchers";
import { getSubcategoryKey } from "@/lib/category-aggregation";

export async function createSellSubcategory(
  props: {
    name: string;
    description?: string;
    categoryId: number;
  },
  domain: string,
) {
  const result = validation.safeParse(props);

  if (!result.success) {
    return { message: "Validazione elemento fallita!" };
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

  const subcategoryName = result.data.name.trim();
  const subcategoryKey = getSubcategoryKey(subcategoryName);

  try {
    const supabase = createServiceClient();

    const { data: category, error: categoryError } = await supabase
      .from("sellproduct_categories")
      .select("id, name")
      .eq("id", result.data.categoryId)
      .eq("site_id", siteId)
      .maybeSingle();

    if (categoryError || !category) {
      return { message: "Categoria non trovata!" };
    }

    const { data: existing } = await supabase
      .from("sellproduct_subcategory_images")
      .select("id")
      .eq("site_id", siteId)
      .eq("category_id", result.data.categoryId)
      .eq("subcategory_key", subcategoryKey)
      .maybeSingle();

    if (existing) {
      return { message: "Questa sottocategoria esiste già!" };
    }

    const { data: lastSubcategory } = await supabase
      .from("sellproduct_subcategory_images")
      .select("sort_order")
      .eq("site_id", siteId)
      .eq("category_id", result.data.categoryId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSortOrder = (lastSubcategory?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("sellproduct_subcategory_images")
      .insert({
        site_id: siteId,
        category_id: result.data.categoryId,
        subcategory_key: subcategoryKey,
        subcategory_name: subcategoryName,
        description: result.data.description?.trim() || null,
        image_url: null,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating sell subcategory:", error);
      return { message: "Creazione sottocategoria fallita!", error: error.message };
    }

    revalidatePath(`/sites/${domain}/product-categories`);
    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating sell subcategory:", error);
    return { message: "Creazione sottocategoria fallita!", error: message };
  }
}
