import { z } from "zod";

export const validation = z.object({
  description: z.string().optional(),
  descriptionCat: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  hours: z.preprocess((val) => Number(val), z.number()),
  minutes: z.preprocess((val) => Number(val), z.number()),
  task: z.union([z.string(), z.number()]).optional(),
  userId: z.union([z.string(), z.number()]).optional(),
  roles: z.union([z.number(), z.string(), z.array(z.number())]).optional(),
  // Support both date and created_at for flexibility
  date: z.preprocess((val) => {
    if (val == null || val === "") return undefined;
    if (val instanceof Date) return val;
    if (typeof val === "string" || typeof val === "number") return new Date(val);
    return undefined;
  }, z.date().optional()),
  created_at: z.preprocess((val) => {
    if (val == null || val === "") return undefined;
    if (val instanceof Date) return val;
    if (typeof val === "string" || typeof val === "number") return new Date(val);
    return undefined;
  }, z.date().optional()),
});
