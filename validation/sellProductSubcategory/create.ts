import { z } from "zod";

export const validation = z.object({
  name: z.string().trim().min(1, "Il nome è obbligatorio"),
  description: z.string().optional(),
  categoryId: z.number().int().positive("Categoria non valida"),
});
