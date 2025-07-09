import { z } from "zod";

export const validation = z.object({
  description: z.string().optional(),
  descriptionCat: z.string().optional(),
  // start: z.string().optional(),
  // end: z.string().optional(),
  hours: z.preprocess((val) => Number(val), z.number()),
  minutes: z.preprocess((val) => Number(val), z.number()),
  task: z.string().min(1),
  userId: z.string().min(1),
  roles: z.string().min(1),
  date: z.string().min(1),
});
