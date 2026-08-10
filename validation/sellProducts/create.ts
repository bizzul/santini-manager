import { z } from "zod";

export const MODALITA_PREZZO_VALUES = [
  "griglia",
  "misure_standard",
  "fisso",
  "mq",
  "mc",
] as const;

export const validation = z.object({
  category: z.string().min(1, {
    message: "Categoria richiesta",
  }),
  subcategory: z.string().min(1, {
    message: "Sottocategoria richiesta",
  }),
  tipo: z.string().optional().default(""),
  product_type: z.string().optional(),
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
  diameter_mm: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    },
    z.number().positive().optional(),
  ),
  length_mm: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    },
    z.number().positive().optional(),
  ),
  modalita_prezzo: z
    .preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.enum(MODALITA_PREZZO_VALUES).optional(),
    )
    .nullable()
    .optional(),
  famiglia_apertura_cod: z
    .string()
    .optional()
    .nullable()
    .or(z.literal("")),
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
