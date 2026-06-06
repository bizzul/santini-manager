"use server";

import { SellProductCategory } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { validation } from "@/validation/sellProductCategory/create";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";

export async function createItem(
  props: Pick<SellProductCategory, "name" | "description" | "color">,
  domain?: string,
) {
  const result = validation.safeParse(props);
  const supabase = await createClient();
  const userContext = await getUserContext();
  let userId = null;
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

  if (userContext) {
    userId = userContext.user.id;
  }

  if (!result.success) {
    return {
      message: "Validazione elemento fallita!",
      error: result.error.message,
    };
  }

  try {
    const serviceSupabase = createServiceClient();

    let nextSortOrder = 0;
    if (siteId) {
      const { data: lastCategory } = await serviceSupabase
        .from("sellproduct_categories")
        .select("sort_order")
        .eq("site_id", siteId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      nextSortOrder = (lastCategory?.sort_order ?? -1) + 1;
    }

    const insertData: Record<string, unknown> = {
      name: props.name,
      description: props.description || null,
      color: props.color || "#3B82F6",
      sort_order: nextSortOrder,
    };

    if (siteId) {
      insertData.site_id = siteId;
    }

    const { data, error } = await supabase
      .from("sellproduct_categories")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating sell product category:", error);
      return { message: "Creazione elemento fallita!", error: error.message };
    }

    if (data && userId) {
      // Create a new Action record to track the user action
      const { error: actionError } = await supabase
        .from("Action")
        .insert({
          type: "sellproduct_category_create",
          data: {
            category_id: data.id,
          },
          user_id: userId,
        });

      if (actionError) {
        console.error("Error creating action record:", actionError);
      }
    }

    if (domain) {
      revalidatePath(`/sites/${domain}/product-categories`);
    }
    return { success: true, data };
  } catch (error: any) {
    console.error("Error creating sell product category:", error);
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
