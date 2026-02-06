import { z } from "zod";

/**
 * Schema for editing an inventory item with variant
 */
export const editInventoryItemSchema = z.object({
  // IDs for the records being updated
  item_id: z.string().uuid().optional(),
  variant_id: z.string().uuid().optional(),

  // Item fields
  name: z.string().min(1, "Nome richiesto").optional(),
  description: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
  item_type: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
  category_id: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.string().uuid().nullable().optional(),
  ),
  supplier_id: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.string().uuid().nullable().optional(),
  ),
  is_stocked: z.boolean().optional(),
  is_consumable: z.boolean().optional(),
  is_active: z.boolean().optional(),

  // Variant fields
  internal_code: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
  supplier_code: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
  producer: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
  producer_code: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
  unit_id: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.string().uuid().nullable().optional(),
  ),
  purchase_unit_price: z.preprocess(
    (val) => (val === "" || val === undefined ? null : Number(val)),
    z.number().nullable().optional(),
  ),
  sell_unit_price: z.preprocess(
    (val) => (val === "" || val === undefined ? null : Number(val)),
    z.number().nullable().optional(),
  ),
  image_url: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
  url_tds: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
  warehouse_number: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),

  // Attributes (will be stored in JSONB)
  color: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
  color_code: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
  width: z.preprocess(
    (val) => (val === "" || val === undefined ? null : Number(val)),
    z.number().nullable().optional(),
  ),
  height: z.preprocess(
    (val) => (val === "" || val === undefined ? null : Number(val)),
    z.number().nullable().optional(),
  ),
  length: z.preprocess(
    (val) => (val === "" || val === undefined ? null : Number(val)),
    z.number().nullable().optional(),
  ),
  thickness: z.preprocess(
    (val) => (val === "" || val === undefined ? null : Number(val)),
    z.number().nullable().optional(),
  ),
  diameter: z.preprocess(
    (val) => (val === "" || val === undefined ? null : Number(val)),
    z.number().nullable().optional(),
  ),

  // Category hierarchy (for display/filtering)
  category: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
  category_code: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
  subcategory: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
  subcategory_code: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
  subcategory2: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
  subcategory2_code: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional(),
  ),
});

export type EditInventoryItemInput = z.infer<typeof editInventoryItemSchema>;

/**
 * Schema for adjusting stock quantity
 */
export const adjustStockSchema = z.object({
  variant_id: z.string().uuid(),
  warehouse_id: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.string().uuid().nullable().optional(),
  ),
  movement_type: z.enum(["in", "out", "adjust"]),
  quantity: z.preprocess(
    (val) => Number(val),
    z.number().positive("Quantità deve essere positiva"),
  ),
  reason: z.string().optional(),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
