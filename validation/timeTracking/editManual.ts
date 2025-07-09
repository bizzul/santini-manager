import { z } from "zod";

export const validation = z.object({
  description: z.string().optional(),
  descriptionCat: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  hours: z.preprocess((val) => Number(val), z.number()),
  minutes: z.preprocess((val) => Number(val), z.number()),
  task: z.string().optional(),
  userId: z.string().optional(),
  roles: z.array(z.number()).optional(),
  //@ts-ignore
  created_at: z.preprocess((val) => new Date(val), z.date()).optional(),
});
