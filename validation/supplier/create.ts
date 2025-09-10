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
  address: z.string().optional(),
  cap: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().optional()),
  location: z.string().optional(),
  website: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  contact: z.string().optional(),
  category: z.string().min(1),
  short_name: z.string().optional(),
  // supplier_image: z.any().optional(),
});
