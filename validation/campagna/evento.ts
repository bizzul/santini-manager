import * as z from "zod";
import { EVENTO_STATI, EVENTO_TIPI } from "@/lib/campagna/config";

export const eventoSchema = z.object({
  titolo: z.string().trim().min(1, "Il titolo e obbligatorio"),
  tipo: z.enum(EVENTO_TIPI, { required_error: "Il tipo e obbligatorio" }),
  stato: z.enum(EVENTO_STATI, { required_error: "Lo stato e obbligatorio" }),
  data_inizio: z.string().trim().min(1, "La data di inizio e obbligatoria"),
  data_fine: z.string().trim().optional().or(z.literal("")),
  luogo: z.string().trim().optional().or(z.literal("")),
  comune: z.string().trim().optional().or(z.literal("")),
});

export type EventoFormData = z.infer<typeof eventoSchema>;
