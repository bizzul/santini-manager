"use server";

import { InventoryCategory } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";
import { validation } from "@/validation/productsCategory/create";
import { getSiteData } from "@/lib/fetchers";

export async function createItem(
  props: Pick<InventoryCategory, "name" | "code" | "description" | "image_url">,
  domain?: string,
) {
  const result = validation.safeParse(props);

  if (!result.success) {
    return { message: "Validazione elemento fallita!" };
  }

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

    const { data: lastCategory } = await supabase
      .from("inventory_categories")
      .select("sort_order")
      .eq("site_id", siteId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSortOrder = (lastCategory?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("inventory_categories")
      .insert({
        site_id: siteId,
        name: props.name,
        code: props.code || null,
        description: props.description || null,
        image_url: props.image_url || null,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating inventory category:", error);
      return { message: "Creazione elemento fallita!", error: error.message };
    }

    revalidatePath(`/sites/${domain}/categories`);
    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating inventory category:", error);
    return { message: "Creazione elemento fallita!", error: message };
  }
}
