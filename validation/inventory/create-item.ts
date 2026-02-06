import { z } from "zod";

/**
 * Schema for creating an inventory item with variant
 */
export const createInventoryItemSchema = z.object({
  // Item fields
  name: z.string().min(1, "Nome richiesto"),
  description: z.string().optional(),
  item_type: z.string().optional(),
  category_id: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.string().uuid().nullable().optional(),
  ),
  supplier_id: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.string().uuid().nullable().optional(),
  ),
  is_stocked: z.boolean().default(true),
  is_consumable: z.boolean().default(true),
  is_active: z.boolean().default(true),

  // Variant fields
  internal_code: z.string().optional().nullable(),
  supplier_code: z.string().optional().nullable(),
  producer: z.string().optional().nullable(),
  producer_code: z.string().optional().nullable(),
  unit_id: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.string().uuid().nullable().optional(),
  ),
  purchase_unit_price: z.preprocess(
    (val) => (val ? Number(val) : null),
    z.number().nullable().optional(),
  ),
  sell_unit_price: z.preprocess(
    (val) => (val ? Number(val) : null),
    z.number().nullable().optional(),
  ),
  image_url: z.string().optional().nullable(),
  url_tds: z.string().optional().nullable(),
  warehouse_number: z.string().optional().nullable(),

  // Attributes (will be stored in JSONB)
  color: z.string().optional().nullable(),
  color_code: z.string().optional().nullable(),
  width: z.preprocess(
    (val) => (val ? Number(val) : null),
    z.number().nullable().optional(),
  ),
  height: z.preprocess(
    (val) => (val ? Number(val) : null),
    z.number().nullable().optional(),
  ),
  length: z.preprocess(
    (val) => (val ? Number(val) : null),
    z.number().nullable().optional(),
  ),
  thickness: z.preprocess(
    (val) => (val ? Number(val) : null),
    z.number().nullable().optional(),
  ),
  diameter: z.preprocess(
    (val) => (val ? Number(val) : null),
    z.number().nullable().optional(),
  ),

  // Category hierarchy (for display/filtering)
  category: z.string().optional().nullable(),
  category_code: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  subcategory_code: z.string().optional().nullable(),
  subcategory2: z.string().optional().nullable(),
  subcategory2_code: z.string().optional().nullable(),

  // Initial stock quantity
  initial_quantity: z.preprocess(
    (val) => (val ? Number(val) : 0),
    z.number().default(0),
  ),
  warehouse_id: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.string().uuid().nullable().optional(),
  ),
});

export type CreateInventoryItemInput = z.infer<
  typeof createInventoryItemSchema
>;
