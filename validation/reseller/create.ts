import * as z from "zod";

/**
 * Reseller create/edit validation schema
 */
export const validation = z.object({
    name: z.string().min(1, "Nome richiesto"),
    contact_person: z.string().optional(),
    country: z.string().optional(),
    country_code: z
        .string()
        .trim()
        .toUpperCase()
        .length(2, "Codice paese ISO2 (2 lettere)")
        .optional()
        .or(z.literal("")),
    address: z.string().optional(),
    zip_city: z.string().optional(),
    phone: z.string().optional(),
    fax: z.string().optional(),
    mobile: z.string().optional(),
    email: z.string().optional(),
    website: z.string().optional(),
    notes: z.string().optional(),
});
