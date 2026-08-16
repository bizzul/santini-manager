import { z } from "zod";

export const COEFFICIENTE_CATEGORIE = [
  "materiale_serramento",
  "vetro",
  "materiale_porta",
  "telaio",
  "esecuzione_ante",
  "tipo_cassone",
  "materiale_arredamento",
] as const;

export const validation = z.object({
  categoria: z.enum(COEFFICIENTE_CATEGORIE, {
    required_error: "Categoria richiesta",
  }),
  codice: z.string().min(1, { message: "Codice richiesto" }),
  descrizione: z.string().optional().nullable(),
  moltiplicatore: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    },
    z.number().positive({ message: "Il moltiplicatore deve essere > 0" }),
  ),
  attivo: z.boolean().default(true),
});

export type CoefficienteFormValues = z.infer<typeof validation>;
