import * as z from "zod";

type FileObject = File;
/**
 * Auth0 user creation schema
 */
export const validation = z.object({
  //email: z.string().email(),
  //password: z.string().min(100,"VA CHE LE TROP CORT"),
  name: z.string(),
  description: z.string().min(1),
  address: z.string().min(1),
  cap: z.preprocess((val) => Number(val), z.number().optional()),
  location: z.string().min(1),
  website: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  contact: z.string().optional(),
  category: z.string().min(1),
  short_name: z.string().optional(),
  // supplier_image: z.any().optional(),
});
