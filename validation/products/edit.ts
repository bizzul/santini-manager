import { z } from "zod";

/**
 * Product edit schema with inventory fields
 */
export const validation = z.object({
  // Base fields
  productCategoryId: z.preprocess((val) => Number(val), z.number()).optional(),
  supplierId: z.preprocess((val) => Number(val), z.number()).optional(),
  name: z.string().optional(),
  unit_price: z.preprocess((val) => Number(val), z.number()),
  description: z.string().nullable().optional(),
  type: z.string().optional(),
  unit: z.string().optional(),

  // Dimensions
  height: z.preprocess((val) => val ? Number(val) : 0, z.number().optional()),
  length: z.preprocess((val) => val ? Number(val) : 0, z.number().optional()),
  width: z.preprocess((val) => val ? Number(val) : 0, z.number().optional()),
  thickness: z.preprocess(
    (val) => val ? Number(val) : null,
    z.number().nullable().optional(),
  ),
  diameter: z.preprocess(
    (val) => val ? Number(val) : null,
    z.number().nullable().optional(),
  ),
  quantity: z.preprocess((val) => Number(val), z.number()).optional(),

  // Category hierarchy
  category: z.string().nullable().optional(),
  category_code: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  subcategory_code: z.string().nullable().optional(),
  subcategory2: z.string().nullable().optional(),
  subcategory2_code: z.string().nullable().optional(),

  // Color
  color: z.string().nullable().optional(),
  color_code: z.string().nullable().optional(),

  // Codes
  internal_code: z.string().nullable().optional(),
  warehouse_number: z.string().nullable().optional(),
  supplier_code: z.string().nullable().optional(),

  // Producer
  producer: z.string().nullable().optional(),
  producer_code: z.string().nullable().optional(),

  // URLs
  url_tds: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),

  // Price
  sell_price: z.preprocess(
    (val) => val ? Number(val) : null,
    z.number().nullable().optional(),
  ),
});
