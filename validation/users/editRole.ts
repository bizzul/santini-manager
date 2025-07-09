import { z } from "zod";

/**
 * Auth0 user creation schema
 */
export const validation = z.object({
  roleId: z.string().optional(),
});
