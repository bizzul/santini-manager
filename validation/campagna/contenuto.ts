import * as z from "zod";
import { CONTENUTO_FORMATI, CONTENUTO_STATI } from "@/lib/campagna/config";

export const contenutoSchema = z.object({
  titolo: z.string().trim().min(1, "Il titolo e obbligatorio"),
  formato: z.enum(CONTENUTO_FORMATI, {
    required_error: "Il formato e obbligatorio",
  }),
  stato: z.enum(CONTENUTO_STATI, {
    required_error: "Lo stato e obbligatorio",
  }),
  corpo_testo: z.string().trim().optional().or(z.literal("")),
  canale: z.string().trim().optional().or(z.literal("")),
  data_pubblicazione_prevista: z.string().trim().optional().or(z.literal("")),
});

export type ContenutoFormData = z.infer<typeof contenutoSchema>;
