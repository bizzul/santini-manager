"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { getUserContext } from "@/lib/auth-utils";

export const removeItem = async (itemId: string) => {
  const userContext = await getUserContext();
  
  try {
    const supabase = await createClient();
    
    // Get item name for logging before deletion
    const { data: item } = await supabase
      .from("inventory_items")
      .select("name, site_id")
      .eq("id", itemId)
      .single();

    // Delete item (variants and movements will cascade)
    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", itemId);
      
    if (error) {
      console.error("Error deleting inventory item:", error);
      return { error: `Failed to delete item: ${error.message}` };
    }

    // Create action record
    if (userContext?.user?.id && item) {
      await supabase.from("Action").insert({
        type: "inventory_item_delete",
        user_id: userContext.user.id,
        data: {
          item_id: itemId,
          name: item.name,
        },
      });
    }

    revalidatePath("/inventory");
    return { success: true };
  } catch (e) {
    console.error("Error in removeItem:", e);
    return { error: `Failed to delete item: ${e}` };
  }
};

/**
 * Delete a specific variant (if item has multiple variants)
 */
export const removeVariant = async (variantId: string) => {
  const userContext = await getUserContext();
  
  try {
    const supabase = await createClient();
    
    // Get variant info before deletion
    const { data: variant } = await supabase
      .from("inventory_item_variants")
      .select("item_id, internal_code, site_id")
      .eq("id", variantId)
      .single();

    if (!variant) {
      return { error: "Variante non trovata" };
    }

    // Check if this is the only variant for the item
    const { count } = await supabase
      .from("inventory_item_variants")
      .select("id", { count: "exact", head: true })
      .eq("item_id", variant.item_id);

    if (count === 1) {
      // If it's the only variant, delete the whole item
      return removeItem(variant.item_id);
    }

    // Delete just the variant (movements will cascade)
    const { error } = await supabase
      .from("inventory_item_variants")
      .delete()
      .eq("id", variantId);
      
    if (error) {
      console.error("Error deleting inventory variant:", error);
      return { error: `Failed to delete variant: ${error.message}` };
    }

    // Create action record
    if (userContext?.user?.id) {
      await supabase.from("Action").insert({
        type: "inventory_variant_delete",
        user_id: userContext.user.id,
        data: {
          variant_id: variantId,
          item_id: variant.item_id,
          internal_code: variant.internal_code,
        },
      });
    }

    revalidatePath("/inventory");
    return { success: true };
  } catch (e) {
    console.error("Error in removeVariant:", e);
    return { error: `Failed to delete variant: ${e}` };
  }
};
