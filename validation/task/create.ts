import { z } from "zod";
// Define a custom Zod parser for a date string
const parseDate = (string: any) => {
  if (string) {
    const date = new Date(string);
    //@ts-ignore
    if (isNaN(date)) {
      throw new Error("Invalid date");
    }
    return date;
  }
};

export const validation = z.object({
  unique_code: z.string().min(1),
  clientId: z
    .preprocess((val) => Number(val), z.number())
    .optional()
    .nullable(),
  productId: z.preprocess((val) => Number(val), z.number()).nullable(),
  deliveryDate: z.date(),
  name: z.string().optional(),
  sellPrice: z.preprocess((val) => Number(val), z.number()),
  other: z.string().optional(),
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
});
