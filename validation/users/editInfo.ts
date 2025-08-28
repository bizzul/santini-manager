import { z } from "zod";

/**
 * Auth0 user creation schema
 */
export const validation = z.object({
  email: z.string().email().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  role: z.string().optional(),
  organization: z.array(z.string()).optional(),
});
