import { z } from "zod";

/**
 * Auth0 user creation schema
 */
export const validation = z.object({
  individualTitle: z.string().optional(),
  businessName: z.string().optional(),
  individualFirstName: z.string().optional(),
  individualLastName: z.string().optional(),
  address: z.string().min(1, { message: "Indirizzo principale richiesto" }),
  city: z.string().min(1, { message: "Città richiesta" }),
  clientType: z.string().optional(),
  countryCode: z.string().min(1, { message: "Paese richiesto" }),
  email: z.string().optional(),
  phone: z.string().optional(),
  clientLanguage: z.string().optional(),
  zipCode: z.preprocess(
    (val) => {
      if (val === "" || val === undefined || val === null) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    },
    z
      .number({ required_error: "CAP richiesto" })
      .nullable()
      .refine((val) => val !== null, {
        message: "CAP richiesto",
      }),
  ),
});
