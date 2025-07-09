import { z } from "zod";

export const validation = z.object({
  name: z.string(),
  description: z.string(),
});
