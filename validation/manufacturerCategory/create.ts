import { z } from "zod";

export const validation = z.object({
    name: z.string().min(1, { message: "Nome richiesto" }),
    code: z.string().optional(),
    description: z.string().min(1, { message: "Descrizione richiesta" }),
});
