import * as z from "zod";
import {
  CONSENSO_BASI_LEGALI,
  CONSENSO_STATI,
  CONTATTO_TIPI,
} from "@/lib/campagna/config";

/**
 * Contact validation. `consenso_stato` and `consenso_base_legale` are REQUIRED:
 * it must be impossible to save a contact without an explicit legal basis and
 * consent state (FADP/LPD compliance for politically sensitive data).
 */
export const contattoSchema = z.object({
  nome: z.string().trim().min(1, "Il nome e obbligatorio"),
  cognome: z.string().trim().optional().or(z.literal("")),
  comune: z.string().trim().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Email non valida")
    .optional()
    .or(z.literal("")),
  telefono: z.string().trim().optional().or(z.literal("")),
  tipo: z.enum(CONTATTO_TIPI, {
    required_error: "Il tipo e obbligatorio",
  }),
  fonte: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().optional().or(z.literal("")),
  consenso_stato: z.enum(CONSENSO_STATI, {
    required_error: "Lo stato del consenso e obbligatorio",
  }),
  consenso_base_legale: z.enum(CONSENSO_BASI_LEGALI, {
    required_error: "La base legale del consenso e obbligatoria",
  }),
});

export type ContattoFormData = z.infer<typeof contattoSchema>;
