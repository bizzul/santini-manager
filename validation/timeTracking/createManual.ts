import { z } from "zod";

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
  // Internal activity is now dynamic from database, so we accept any string
  internalActivity: z.string().optional(),
  // Lunch off-site fields
  lunchOffsite: z.boolean().default(false),
  lunchLocation: z.string().optional(),
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
    path: ["lunchLocation"],
  },
);
