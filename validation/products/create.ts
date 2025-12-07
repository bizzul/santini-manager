import { z } from "zod";

/**
 * Product creation schema with inventory fields
 */
export const validation = z.object({
  // Required fields
  productCategoryId: z
    .union([z.number(), z.literal(null)])
    .refine((val) => val !== null, {
      message: "Categoria prodotto richiesta",
    }),
  supplierId: z
    .union([z.number(), z.literal(null)])
    .refine((val) => val !== null, {
      message: "Fornitore richiesto",
    }),
  name: z.string().min(1, "Nome richiesto"),
  unit_price: z.preprocess((val) => Number(val), z.number()),
  quantity: z.preprocess((val) => Number(val), z.number()),
  type: z.string({ required_error: "Tipo richiesto" }),
  unit: z.string({ required_error: "Unità richiesta" }),
  
  // Dimensions
  height: z.preprocess((val) => val ? Number(val) : 0, z.number().optional()),
  length: z.preprocess((val) => val ? Number(val) : 0, z.number().optional()),
  width: z.preprocess((val) => val ? Number(val) : 0, z.number().optional()),
  thickness: z.preprocess((val) => val ? Number(val) : null, z.number().nullable().optional()),
  diameter: z.preprocess((val) => val ? Number(val) : null, z.number().nullable().optional()),
  
  // Category hierarchy
  category: z.string().optional(),
  category_code: z.string().optional(),
  subcategory: z.string().optional(),
  subcategory_code: z.string().optional(),
  subcategory2: z.string().optional(),
  subcategory2_code: z.string().optional(),
  
  // Color
  color: z.string().optional(),
  color_code: z.string().optional(),
  
  // Codes
  internal_code: z.string().optional(),
  warehouse_number: z.string().optional(),
  supplier_code: z.string().optional(),
  
  // Producer
  producer: z.string().optional(),
  producer_code: z.string().optional(),
  
  // Other
  description: z.string().optional(),
  url_tds: z.string().optional(),
  image_url: z.string().optional(),
  sell_price: z.preprocess((val) => val ? Number(val) : null, z.number().nullable().optional()),
});
