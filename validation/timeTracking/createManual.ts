import { z } from "zod";

export const validation = z.object({
  description: z.string().optional(),
  descriptionCat: z.string().optional(),
  hours: z.coerce.number(),
  minutes: z.coerce.number(),
  task: z.string().optional(),
  userId: z.string().min(1, "Seleziona un dipendente"),
  roles: z.string().optional(),
  date: z.string().min(1, "Seleziona una data"),
  activityType: z.enum(["project", "internal"]).default("project"),
  internalActivity: z.string().optional(),
  lunchOffsite: z.boolean().default(false),
  lunchLocation: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.activityType === "project") {
    if (!data.task || data.task.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Seleziona un progetto",
        path: ["task"],
      });
    }
    if (!data.roles || data.roles.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Seleziona un reparto",
        path: ["roles"],
      });
    }
  } else if (data.activityType === "internal") {
    if (!data.internalActivity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Seleziona un'attività interna",
        path: ["internalActivity"],
      });
    }
  }

  if (data.hours === 0 && data.minutes === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Inserisci almeno un'ora o dei minuti",
      path: ["hours"],
    });
  }

  if (data.lunchOffsite && (!data.lunchLocation || data.lunchLocation.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Inserisci il luogo del pranzo",
      path: ["lunchLocation"],
    });
  }
});
