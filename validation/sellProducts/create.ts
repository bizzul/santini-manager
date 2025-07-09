import { z } from "zod";

export const validation = z.object({
  name: z.string().min(1, {
    message: "Nome richiesto",
  }),
  type: z.string().min(1, {
    message: "Tipo richiesto",
  }),
  active: z.boolean().default(true),
});
