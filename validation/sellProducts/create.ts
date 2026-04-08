import { z } from "zod";

export const validation = z.object({
  category: z.string().min(1, {
    message: "Categoria richiesta",
  }),
  subcategory: z.string().min(1, {
    message: "Sottocategoria richiesta",
  }),
  product_type: z.string().min(1, {
    message: "Tipo richiesto",
  }),
  name: z.string().min(1, {
    message: "Nome prodotto richiesto",
  }),
  type: z.string().optional(),
  supplier_id: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    },
    z.number().int().positive().optional(),
  ),
  description: z.string().optional(),
  price_list: z.boolean().default(false),
  image_url: z
    .string()
    .url({ message: "URL immagine non valido" })
    .optional()
    .or(z.literal("")),
  doc_url: z
    .string()
    .url({ message: "URL documenti non valido" })
    .optional()
    .or(z.literal("")),
  active: z.boolean().default(true),
});
