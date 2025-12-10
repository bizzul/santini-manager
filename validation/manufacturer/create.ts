import * as z from "zod";

type FileObject = File;
/**
 * Manufacturer create validation schema
 */
export const validation = z.object({
  name: z.string().min(1, "Nome richiesto"),
  description: z.string().optional(),
  address: z.string().optional(),
  cap: z.preprocess(
    (val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().optional(),
  ),
  location: z.string().optional(),
  website: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  contact: z.string().optional(),
  manufacturer_category_id: z.preprocess(
    (val) => (val ? Number(val) : null),
    z.number().nullable().optional(),
  ),
  short_name: z.string().optional(),
});
