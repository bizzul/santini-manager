import { z } from "zod";

/**
 * Auth0 user creation schema
 */
export const validation = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Va che l’è trop cürt"),
  given_name: z.string(),
  family_name: z.string(),
  role: z.string().optional(),
  color: z.string().optional(),
  incarichi: z.string(),
  initials: z.string().optional(),
});
