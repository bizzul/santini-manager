import { z } from "zod";

/**
 * Auth0 user creation schema
 */
export const validation = z.object({
  email: z.string().email().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  color: z.string().optional(),
  incarichi: z.array(z.string().optional()),
  initials: z.string().optional(),
  role: z.string().optional(),
  enabled: z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return val;
    })
    .optional(),
});
