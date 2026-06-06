"use server";

import { InventoryCategory } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";
import { validation } from "@/validation/productsCategory/create";
import { getSiteData } from "@/lib/fetchers";

export async function editItem(
  props: Pick<InventoryCategory, "name" | "code" | "description" | "image_url">,
  id: string,
  domain?: string,
) {
  const result = validation.safeParse(props);

  if (!result.success) {
    return { error: "Validazione elemento fallita!" };
  }

  if (!domain) {
    return { error: "Dominio sito mancante!" };
  }

  let siteId: string | null = null;

  try {
    const siteResult = await getSiteData(domain);
    siteId = siteResult?.data?.id ?? null;
  } catch (error) {
    console.error("Error fetching site data:", error);
  }

  if (!siteId) {
    return { error: "Sito non trovato!" };
  }

  try {
    const supabase = createServiceClient();
    const updatePayload: Record<string, unknown> = {
      name: props.name,
      code: props.code || null,
      description: props.description || null,
      updated_at: new Date().toISOString(),
    };

    if (props.image_url !== undefined) {
      updatePayload.image_url = props.image_url || null;
    }

    const { data, error } = await supabase
      .from("inventory_categories")
      .update(updatePayload)
      .eq("id", id)
      .eq("site_id", siteId)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { error: "Una categoria con questo nome esiste già" };
      }
      console.error("Error updating inventory category:", error);
      return { error: error.message };
    }

    revalidatePath(`/sites/${domain}/categories`);
    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error updating inventory category:", error);
    return { error: message };
  }
}
