import { z } from "zod";

export const SUPPLEMENTO_TIPI_CALCOLO = [
  "fisso_chf",
  "percentuale",
  "per_mq",
  "per_metro_lineare",
] as const;

export const SUPPLEMENTO_CATEGORIE = [
  "Arredamento",
  "Porte",
  "Serramenti",
  "Accessori",
  "Posa",
  "Service",
  "tutte",
] as const;

export const validation = z.object({
  codice: z
    .string()
    .min(1, { message: "Codice richiesto" })
    .max(50, { message: "Codice troppo lungo" }),
  nome: z.string().min(1, { message: "Nome richiesto" }),
  descrizione: z.string().optional().or(z.literal("")),
  tipo_calcolo: z.enum(SUPPLEMENTO_TIPI_CALCOLO, {
    errorMap: () => ({ message: "Tipo di calcolo non valido" }),
  }),
  valore: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, z.number({ required_error: "Valore richiesto" }).nonnegative({ message: "Il valore non puo essere negativo" })),
  categorie: z
    .array(z.enum(SUPPLEMENTO_CATEGORIE))
    .min(1, { message: "Seleziona almeno una categoria" }),
  attivo: z.boolean().default(true),
});

export type SupplementoFormValues = z.infer<typeof validation>;
