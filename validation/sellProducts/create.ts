import { z } from "zod";

export const validation = z.object({
  category: z.string().min(1, {
    message: "Categoria richiesta",
  }),
  name: z.string().min(1, {
    message: "Nome prodotto richiesto",
  }),
  type: z.string().optional(),
  description: z.string().optional(),
  price_list: z.boolean().default(false),
  image_url: z.string().url({ message: "URL immagine non valido" }).optional().or(z.literal("")),
  doc_url: z.string().url({ message: "URL documenti non valido" }).optional().or(z.literal("")),
  active: z.boolean().default(true),
});
