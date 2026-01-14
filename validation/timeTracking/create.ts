import { z } from "zod";

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
    // Internal activity is now dynamic from database, so we accept any string
    internalActivity: z.string().optional(),
    // Lunch off-site fields
    lunchOffsite: z.boolean().default(false),
    lunchLocation: z.string().optional(),
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
  ).refine(
    (data) => {
      // If lunch_offsite is true, lunch_location must be provided
      if (data.lunchOffsite) {
        return !!data.lunchLocation && data.lunchLocation.trim().length > 0;
      }
      return true;
    },
    {
      message: "Inserisci il luogo del pranzo",
    },
  ),
);
