"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { editInventoryItemSchema } from "@/validation/inventory";
import { getUserContext } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";

export async function editItem(formData: any, itemId: string, variantId?: string) {
  const result = editInventoryItemSchema.safeParse(formData);
  const userContext = await getUserContext();
  let userId = null;
  if (userContext) {
    userId = userContext.user.id;
  }

  if (result.success) {
    try {
      const supabase = await createClient();
      const data = result.data;

      // Update item
      const itemUpdate: Record<string, any> = {};
      if (data.name !== undefined) itemUpdate.name = data.name;
      if (data.description !== undefined) itemUpdate.description = data.description;
      if (data.item_type !== undefined) itemUpdate.item_type = data.item_type;
      if (data.category_id !== undefined) itemUpdate.category_id = data.category_id;
      if (data.supplier_id !== undefined) itemUpdate.supplier_id = data.supplier_id;
      if (data.is_stocked !== undefined) itemUpdate.is_stocked = data.is_stocked;
      if (data.is_consumable !== undefined) itemUpdate.is_consumable = data.is_consumable;
      if (data.is_active !== undefined) itemUpdate.is_active = data.is_active;

      if (Object.keys(itemUpdate).length > 0) {
        const { error: itemError } = await supabase
          .from("inventory_items")
          .update(itemUpdate)
          .eq("id", itemId);

        if (itemError) {
          console.error("Error updating inventory item:", itemError);
          return { error: itemError.message };
        }
      }

      // Update variant if variantId provided
      if (variantId) {
        const variantUpdate: Record<string, any> = {};
        if (data.internal_code !== undefined) variantUpdate.internal_code = data.internal_code;
        if (data.supplier_code !== undefined) variantUpdate.supplier_code = data.supplier_code;
        if (data.producer !== undefined) variantUpdate.producer = data.producer;
        if (data.producer_code !== undefined) variantUpdate.producer_code = data.producer_code;
        if (data.unit_id !== undefined) variantUpdate.unit_id = data.unit_id;
        if (data.purchase_unit_price !== undefined) variantUpdate.purchase_unit_price = data.purchase_unit_price;
        if (data.sell_unit_price !== undefined) variantUpdate.sell_unit_price = data.sell_unit_price;
        if (data.image_url !== undefined) variantUpdate.image_url = data.image_url;
        if (data.url_tds !== undefined) variantUpdate.url_tds = data.url_tds;

        // Build attributes update
        const attributes: Record<string, any> = {};
        if (data.color !== undefined) attributes.color = data.color;
        if (data.color_code !== undefined) attributes.color_code = data.color_code;
        if (data.width !== undefined) attributes.width = data.width;
        if (data.height !== undefined) attributes.height = data.height;
        if (data.length !== undefined) attributes.length = data.length;
        if (data.thickness !== undefined) attributes.thickness = data.thickness;
        if (data.diameter !== undefined) attributes.diameter = data.diameter;
        if (data.category !== undefined) attributes.category = data.category;
        if (data.category_code !== undefined) attributes.category_code = data.category_code;
        if (data.subcategory !== undefined) attributes.subcategory = data.subcategory;
        if (data.subcategory_code !== undefined) attributes.subcategory_code = data.subcategory_code;
        if (data.subcategory2 !== undefined) attributes.subcategory2 = data.subcategory2;
        if (data.subcategory2_code !== undefined) attributes.subcategory2_code = data.subcategory2_code;

        if (Object.keys(attributes).length > 0) {
          // Merge with existing attributes
          const { data: existingVariant } = await supabase
            .from("inventory_item_variants")
            .select("attributes")
            .eq("id", variantId)
            .single();

          variantUpdate.attributes = {
            ...(existingVariant?.attributes || {}),
            ...attributes,
          };
        }

        if (Object.keys(variantUpdate).length > 0) {
          const { error: variantError } = await supabase
            .from("inventory_item_variants")
            .update(variantUpdate)
            .eq("id", variantId);

          if (variantError) {
            console.error("Error updating inventory variant:", variantError);
            return { error: variantError.message };
          }
        }
      }

      // Create action record for tracking
      if (userId) {
        await supabase.from("Action").insert({
          type: "inventory_item_update",
          user_id: userId,
          data: {
            item_id: itemId,
            variant_id: variantId,
            name: data.name,
          },
        });
      }

      revalidatePath("/inventory");
      return { success: true };
    } catch (e) {
      logger.error(e);
      return { error: "Modifica elemento fallita!" };
    }
  } else {
    console.error("Validation errors:", result.error.errors);
    return { error: "Validazione fallita!" };
  }
}

/**
 * Adjust stock quantity for a variant
 */
export async function adjustStock(
  variantId: string, 
  quantity: number, 
  movementType: 'in' | 'out' | 'adjust',
  reason?: string,
  warehouseId?: string
) {
  const userContext = await getUserContext();
  
  try {
    const supabase = await createClient();

    // Get variant to get site_id
    const { data: variant, error: variantError } = await supabase
      .from("inventory_item_variants")
      .select("site_id, unit_id")
      .eq("id", variantId)
      .single();

    if (variantError || !variant) {
      return { error: "Variante non trovata" };
    }

    // For 'out' movements, check current stock
    if (movementType === 'out') {
      const { data: currentStock } = await supabase
        .from("inventory_stock")
        .select("quantity")
        .eq("variant_id", variantId)
        .maybeSingle();

      const availableQty = currentStock?.quantity || 0;
      if (quantity > availableQty) {
        return { error: `Quantità insufficiente. Disponibili: ${availableQty}` };
      }
    }

    // Create stock movement
    const { error: movementError } = await supabase
      .from("inventory_stock_movements")
      .insert({
        site_id: variant.site_id,
        variant_id: variantId,
        warehouse_id: warehouseId || null,
        movement_type: movementType,
        quantity: Math.abs(quantity),
        unit_id: variant.unit_id,
        reason: reason || null,
        reference_type: "manual",
      });

    if (movementError) {
      console.error("Error creating stock movement:", movementError);
      return { error: movementError.message };
    }

    // Create action record
    if (userContext?.user?.id) {
      await supabase.from("Action").insert({
        type: "inventory_stock_adjustment",
        user_id: userContext.user.id,
        data: {
          variant_id: variantId,
          movement_type: movementType,
          quantity,
          reason,
        },
      });
    }

    revalidatePath("/inventory");
    return { success: true };
  } catch (e) {
    logger.error(e);
    return { error: "Errore nell'aggiornamento stock" };
  }
}
