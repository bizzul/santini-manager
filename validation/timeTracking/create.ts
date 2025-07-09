import { z } from "zod";

export const validation = z.array(
  z.object({
    description: z.string().optional(),
    descriptionCat: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    hours: z.preprocess((val) => Number(val), z.number()),
    minutes: z.preprocess((val) => Number(val), z.number()),
    task: z.string(),
    userId: z.string(),
    roles: z.object({ id: z.number(), name: z.string() }),
  })
);
