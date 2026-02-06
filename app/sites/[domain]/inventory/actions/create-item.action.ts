"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { createInventoryItemSchema } from "@/validation/inventory";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteContextFromDomain } from "@/lib/site-context";

export async function createItem(props: any, domain?: string) {
  console.log("Creating inventory item with data:", JSON.stringify(props, null, 2));
  const result = createInventoryItemSchema.safeParse(props);
  const userContext = await getUserContext();
  let userId = null;
  let siteId = null;
  
  if (userContext) {
    userId = userContext.user.id;
  }

  // Get site_id from domain
  if (domain) {
    const context = await getSiteContextFromDomain(domain);
    siteId = context.siteId;
  }

  if (!siteId) {
    return { error: "Site ID richiesto" };
  }

  if (result.success) {
    try {
      const supabase = await createClient();
      const data = result.data;

      // Create item
      const { data: item, error: itemError } = await supabase
        .from("inventory_items")
        .insert({
          site_id: siteId,
          name: data.name,
          description: data.description || null,
          item_type: data.item_type || null,
          category_id: data.category_id || null,
          supplier_id: data.supplier_id || null,
          is_stocked: data.is_stocked ?? true,
          is_consumable: data.is_consumable ?? true,
          is_active: data.is_active ?? true,
        })
        .select()
        .single();

      if (itemError) {
        console.error("Error creating inventory item:", itemError);
        return { error: `Errore nella creazione: ${itemError.message}` };
      }

      // Build attributes object
      const attributes = {
        color: data.color || null,
        color_code: data.color_code || null,
        width: data.width || null,
        height: data.height || null,
        length: data.length || null,
        thickness: data.thickness || null,
        diameter: data.diameter || null,
        category: data.category || null,
        category_code: data.category_code || null,
        subcategory: data.subcategory || null,
        subcategory_code: data.subcategory_code || null,
        subcategory2: data.subcategory2 || null,
        subcategory2_code: data.subcategory2_code || null,
      };

      // Create variant
      const { data: variant, error: variantError } = await supabase
        .from("inventory_item_variants")
        .insert({
          item_id: item.id,
          site_id: siteId,
          internal_code: data.internal_code || null,
          supplier_code: data.supplier_code || null,
          producer: data.producer || null,
          producer_code: data.producer_code || null,
          unit_id: data.unit_id || null,
          purchase_unit_price: data.purchase_unit_price || null,
          sell_unit_price: data.sell_unit_price || null,
          attributes,
          image_url: data.image_url || null,
          url_tds: data.url_tds || null,
          warehouse_number: data.warehouse_number || null,
        })
        .select()
        .single();

      if (variantError) {
        console.error("Error creating inventory variant:", variantError);
        // Rollback item creation
        await supabase.from("inventory_items").delete().eq("id", item.id);
        return { error: `Errore nella creazione variante: ${variantError.message}` };
      }

      // Create initial stock movement if quantity > 0
      const initialQty = data.initial_quantity || 0;
      if (initialQty > 0) {
        const { error: movementError } = await supabase
          .from("inventory_stock_movements")
          .insert({
            site_id: siteId,
            variant_id: variant.id,
            warehouse_id: data.warehouse_id || null,
            movement_type: "opening",
            quantity: initialQty,
            unit_id: data.unit_id || null,
            reason: "Stock iniziale",
            reference_type: "manual",
          });

        if (movementError) {
          console.error("Error creating initial stock movement:", movementError);
          // Continue anyway, stock can be adjusted later
        }
      }

      // Create action record for tracking
      if (userId) {
        await supabase.from("Action").insert({
          type: "inventory_item_create",
          user_id: userId,
          data: {
            item_id: item.id,
            variant_id: variant.id,
            name: data.name,
          },
        });
      }

      revalidatePath("/inventory");
      return { success: true, item, variant };
    } catch (e) {
      console.error("Error in createItem:", e);
      return { error: `Errore nel creare l'elemento: ${e}` };
    }
  } else {
    console.error("Validation errors:", result.error.errors);
    const errorDetails = result.error.errors.map(e => {
      const field = e.path.join('.');
      return `${field}: ${e.message}`;
    }).join("; ");
    return { 
      error: `Validazione fallita - ${errorDetails}`,
      validationErrors: result.error.errors 
    };
  }
}
