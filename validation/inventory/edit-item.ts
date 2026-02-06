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
  description: z.string().optional().nullable(),
  item_type: z.string().optional().nullable(),
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
  internal_code: z.string().optional().nullable(),
  supplier_code: z.string().optional().nullable(),
  producer: z.string().optional().nullable(),
  producer_code: z.string().optional().nullable(),
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
  image_url: z.string().optional().nullable(),
  url_tds: z.string().optional().nullable(),
  warehouse_number: z.string().optional().nullable(),

  // Attributes (will be stored in JSONB)
  color: z.string().optional().nullable(),
  color_code: z.string().optional().nullable(),
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
  category: z.string().optional().nullable(),
  category_code: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  subcategory_code: z.string().optional().nullable(),
  subcategory2: z.string().optional().nullable(),
  subcategory2_code: z.string().optional().nullable(),
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
