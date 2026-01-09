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

export const validation = z.array(
  z.object({
    description: z.string().optional(),
    descriptionCat: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    hours: z.preprocess((val) => Number(val), z.number()),
    minutes: z.preprocess((val) => Number(val), z.number()),
    task: z.string().optional(), // Optional for internal activities
    userId: z.string(),
    roles: z.object({ id: z.number(), name: z.string() }).optional(), // Optional for internal activities
    activityType: z.enum(["project", "internal"]).default("project"),
    internalActivity: z.enum(INTERNAL_ACTIVITIES).optional(),
  }).refine(
    (data) => {
      // If activity type is 'project', task and roles must be provided
      if (data.activityType === "project") {
        return !!data.task && !!data.roles;
      }
      // If activity type is 'internal', only internalActivity must be provided (roles optional)
      if (data.activityType === "internal") {
        return !!data.internalActivity;
      }
      return true;
    },
    {
      message: "Seleziona un progetto e reparto, oppure un'attività interna",
    },
  ),
);
