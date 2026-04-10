import { z } from "zod";
import { parseLocalDate } from "@/lib/utils";

// Define a custom Zod parser for a date string or Date object
// Uses parseLocalDate to avoid UTC timezone issues with date-only strings
const parseDate = (value: any) => {
  if (value === null || value === undefined) {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    const date = parseLocalDate(value);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  }
  return null;
};

export const validation = z.object({
  // unique_code è opzionale: se non fornito, viene generato automaticamente dal server
  unique_code: z.string().min(1).optional(),
  clientId: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z.number()
    )
    .optional()
    .nullable(),
  // Voice assistant flows can create tasks without an explicit product selection.
  productId: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().nullable()
  ).optional(),
  // Array of product IDs for quick add (multiple products)
  productIds: z.array(z.number()).optional().nullable(),
  deliveryDate: z.preprocess(parseDate, z.date().optional().nullable()),
  termine_produzione: z.preprocess(parseDate, z.date().optional().nullable()),
  offerSendDate: z.preprocess(parseDate, z.date().optional().nullable()),
  produzione_data_inizio: z.preprocess(parseDate, z.date().optional().nullable()),
  produzione_data_fine: z.preprocess(parseDate, z.date().optional().nullable()),
  posa_data_inizio: z.preprocess(parseDate, z.date().optional().nullable()),
  posa_data_fine: z.preprocess(parseDate, z.date().optional().nullable()),
  produzione_ora_inizio: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{1,2}:\d{2}(:\d{2})?$/).optional().nullable()),
  produzione_ora_fine: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{1,2}:\d{2}(:\d{2})?$/).optional().nullable()),
  posa_ora_inizio: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{1,2}:\d{2}(:\d{2})?$/).optional().nullable()),
  posa_ora_fine: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{1,2}:\d{2}(:\d{2})?$/).optional().nullable()),
  produzione_collaborator_ids: z.array(z.string()).optional().nullable(),
  posa_collaborator_ids: z.array(z.string()).optional().nullable(),
  assigned_collaborator_ids: z.array(z.string()).optional().nullable(),
  // Posa/Service: ora inizio/fine (HH:mm), squadra (1 o 2)
  ora_inizio: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{1,2}:\d{2}(:\d{2})?$/).optional().nullable()),
  ora_fine: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{1,2}:\d{2}(:\d{2})?$/).optional().nullable()),
  squadra: z.preprocess((val) => (val ? Number(val) : null), z.union([z.literal(1), z.literal(2)]).optional().nullable()),
  name: z.string().optional(),
  luogo: z.string().optional(),
  sellPrice: z.preprocess((val) => Number(val), z.number()),
  numero_pezzi: z.preprocess((val) => (val ? Number(val) : null), z.number())
    .optional().nullable(),
  other: z.string().optional(),
  offerProducts: z.array(z.object({
    productId: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z.number().nullable()
    ).optional(),
    productName: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    quantity: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z.number().nullable()
    ).optional(),
    unitPrice: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z.number().nullable()
    ).optional(),
    totalPrice: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z.number().nullable()
    ).optional(),
  })).optional().nullable(),
  offerLossReason: z.string().optional().nullable(),
  offerLossCompetitorName: z.string().optional().nullable(),
  fileIds: z.array(z.number()).optional(),
  position1: z.string().optional(),
  position2: z.string().optional(),
  position3: z.string().optional(),
  position4: z.string().optional(),
  position5: z.string().optional(),
  position6: z.string().optional(),
  position7: z.string().optional(),
  position8: z.string().optional(),
  kanbanId: z
    .preprocess((val) => Number(val), z.number())
    .refine((val) => val !== null && val !== undefined, {
      message: "È necessario selezionare un kanban",
    }),
  kanbanColumnId: z
    .preprocess((val) => (val ? Number(val) : null), z.number())
    .optional()
    .nullable(),
  // ID dell'offerta collegata (parent task)
  parentTaskId: z
    .preprocess((val) => (val ? Number(val) : null), z.number())
    .optional()
    .nullable(),
  // Flag per bozze offerta (quick add)
  isDraft: z.boolean().optional().default(false),
  // Array of category IDs for draft offers (filter products when completing)
  draftCategoryIds: z.array(z.number()).optional().nullable(),
});
