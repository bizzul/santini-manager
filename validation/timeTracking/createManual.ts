import { z } from "zod";

// Internal activity types
export const INTERNAL_ACTIVITIES = [
  "pulizie",
  "manutenzione",
  "logistica",
  "inventario",
  "formazione",
  "riunione",
  "altro",
] as const;

export const validation = z.object({
  description: z.string().optional(),
  descriptionCat: z.string().optional(),
  hours: z.coerce.number(),
  minutes: z.coerce.number(),
  task: z.string().optional(), // Optional for internal activities
  userId: z.string().min(1),
  roles: z.string().optional(), // Optional for internal activities
  date: z.string().min(1),
  activityType: z.enum(["project", "internal"]).default("project"),
  internalActivity: z.enum(INTERNAL_ACTIVITIES).optional(),
}).refine(
  (data) => {
    // If activity type is 'project', task and roles must be provided
    if (data.activityType === "project") {
      return !!data.task && data.task.length > 0 && !!data.roles &&
        data.roles.length > 0;
    }
    // If activity type is 'internal', only internalActivity must be provided (roles optional)
    if (data.activityType === "internal") {
      return !!data.internalActivity;
    }
    return true;
  },
  {
    message: "Seleziona un progetto e reparto, oppure un'attività interna",
    path: ["task"],
  },
);
