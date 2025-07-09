import { z } from "zod";

/**
 * Auth0 user creation schema
 */
export const validation = z.object({
  //email: z.string().email(),
  //password: z.string().min(100,"VA CHE LE TROP CORT"),
  rolesId: z.preprocess((val) => Number(val), z.number()),
  name: z.string(),
  lastName: z.string(),
  initial: z.string(),
  color: z.string(),
});
