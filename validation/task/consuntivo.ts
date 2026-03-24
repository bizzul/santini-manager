import { z } from "zod";

const currencyValue = z.preprocess((value) => {
  if (value === "" || value == null) return 0;
  if (typeof value === "string") {
    return Number(value.replace(",", "."));
  }
  return Number(value);
}, z.number().finite().min(0));

export const projectConsuntivoValidation = z.object({
  taskId: z.preprocess((value) => Number(value), z.number().int().positive()),
  manualMaterialCost: currencyValue.default(0),
  defaultHourlyRate: currencyValue.refine((value) => value > 0, {
    message: "La tariffa oraria deve essere maggiore di zero.",
  }),
  collaboratorRates: z.record(currencyValue).default({}),
});

export const projectConsuntivoReportValidation = z.object({
  taskId: z.preprocess((value) => Number(value), z.number().int().positive()),
});
