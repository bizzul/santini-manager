import { z } from "zod";

/**
 * Auth0 user creation schema
 */
export const validation = z.object({
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
  name: z.string().min(1),
  unit_price: z.preprocess((val) => Number(val), z.number()),
  description: z.string().optional(),
  height: z.preprocess((val) => Number(val), z.number()),
  length: z.preprocess((val) => Number(val), z.number()),
  width: z.preprocess((val) => Number(val), z.number()),
  quantity: z.preprocess((val) => Number(val), z.number()),
  type: z.string({ required_error: "Tipo richiesto" }),
  unit: z.string({ required_error: "Unita richiesta" }),
});
