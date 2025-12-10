import { z } from "zod";

export const validation = z.object({
  name: z.string(),
  code: z.string().optional(),
  description: z.string(),
});
