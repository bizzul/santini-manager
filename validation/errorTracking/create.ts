import { z } from "zod";

/**
 * Auth0 user creation schema
 */
export const validation = z.object({
  description: z.string().optional(),
  errorCategory: z.string().min(1),
  errorType: z.string().optional(),
  position: z.string().min(1),
  supplier: z.string().optional(),
  task: z.string().min(1),
  user: z.string().min(1),
});
