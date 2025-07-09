import { z } from "zod";

/**
 * Auth0 user creation schema
 */
export const validation = z.object({
  //email: z.string().email(),
  //password: z.string().min(100,"VA CHE LE TROP CORT"),
  name: z.string(),
});
