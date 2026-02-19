import { z } from "zod";

/**
 * Error tracking creation schema
 */
export const validation = z.object({
  description: z.string().optional(),
  errorCategory: z.string().min(1),
  errorType: z.string().optional(),
  supplier: z.string().optional(),
  task: z.string().min(1),
  user: z.string().optional(),
  position: z.string().optional(),
  // Optional fields (dopo descrizione)
  materialCost: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const n = Number(v);
      return Number.isNaN(n) ? undefined : n;
    }),
  timeSpentHours: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const n = Number(v);
      return Number.isNaN(n) ? undefined : n;
    }),
  transferKm: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const n = Number(v);
      return Number.isNaN(n) ? undefined : n;
    }),
});
