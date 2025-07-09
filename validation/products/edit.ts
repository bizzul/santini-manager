import { z } from "zod";

/**
 * Auth0 user creation schema
 */
export const validation = z.object({
  productCategoryId: z.preprocess((val) => Number(val), z.number()).optional(),
  supplierId: z.preprocess((val) => Number(val), z.number()).optional(),
  name: z.string().optional(),
  unit_price: z.preprocess((val) => Number(val), z.number()),
  description: z.string().nullable().optional(),
  height: z.preprocess((val) => Number(val), z.number()).optional(),
  length: z.preprocess((val) => Number(val), z.number()).optional(),
  width: z.preprocess((val) => Number(val), z.number()).optional(),
  quantity: z.preprocess((val) => Number(val), z.number()).optional(),
  type: z.string().optional(),
  unit: z.string().optional(),
});
