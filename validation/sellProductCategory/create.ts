import { z } from "zod";

export const validation = z.object({
    name: z.string().min(1, { message: "Nome richiesto" }),
    description: z.string().optional(),
    color: z.string().optional(),
});
