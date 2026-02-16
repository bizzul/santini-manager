import { z } from "zod";

export const ExtractedTimetrackingSchema = z.object({
  activityType: z.enum(["project", "internal"]),
  projectCode: z.string().optional().nullable(),
  hours: z.number().min(0).max(24),
  minutes: z.number().min(0).max(59),
  description: z.string().optional().nullable(),
  internalActivity: z.string().optional().nullable(),
});

export type ExtractedTimetracking = z.infer<typeof ExtractedTimetrackingSchema>;

export const VoiceInputTimetrackingRequestSchema = z.object({
  transcript: z.string().min(1),
  siteId: z.string().min(1),
});
