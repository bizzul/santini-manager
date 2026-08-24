import { z } from "zod";
import {
  SUPPORT_PRIORITIES,
  SUPPORT_SOURCES,
  SUPPORT_TICKET_STATUSES,
} from "@/lib/support/settings";

const errorSampleSchema = z.object({
  message: z.string().max(2000),
  stack: z.string().max(4000).optional(),
  digest: z.string().max(200).optional(),
  at: z.string().max(40),
});

export const supportClientContextSchema = z.object({
  pathname: z.string().max(500).optional(),
  search: z.string().max(500).optional(),
  module: z.string().max(80).optional(),
  userAgent: z.string().max(500).optional(),
  viewport: z
    .object({
      width: z.number().int().min(0).max(10000),
      height: z.number().int().min(0).max(10000),
    })
    .optional(),
  locale: z.string().max(12).optional(),
  assistanceLevel: z.string().max(40).optional(),
  errorDigest: z.string().max(200).optional(),
  recentErrors: z.array(errorSampleSchema).max(10).optional(),
  source: z.enum(SUPPORT_SOURCES).optional(),
});

export const createConversationSchema = z.object({
  domain: z.string().min(1),
  query: z.string().trim().min(3).max(4000),
  context: supportClientContextSchema.optional(),
});

export const searchSupportSchema = z.object({
  domain: z.string().min(1),
  conversationId: z.string().uuid(),
  query: z.string().trim().min(3).max(4000),
});

export const feedbackSupportSchema = z.object({
  domain: z.string().min(1),
  conversationId: z.string().uuid(),
  articleId: z.string().uuid(),
  resolved: z.boolean(),
});

export const createTicketSchema = z.object({
  domain: z.string().min(1),
  conversationId: z.string().uuid(),
  subject: z.string().trim().min(4).max(200),
  details: z.string().trim().min(8).max(8000).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  priority: z.enum(SUPPORT_PRIORITIES).optional(),
  source: z.enum(SUPPORT_SOURCES).optional(),
});

export const listTicketsQuerySchema = z.object({
  domain: z.string().optional(),
  scope: z.enum(["mine", "site", "all"]).optional(),
  status: z.enum(SUPPORT_TICKET_STATUSES).optional(),
  priority: z.enum(SUPPORT_PRIORITIES).optional(),
  categoryId: z.string().uuid().optional(),
  q: z.string().max(200).optional(),
});

export const patchTicketSchema = z.object({
  domain: z.string().min(1).optional(),
  status: z.enum(SUPPORT_TICKET_STATUSES).optional(),
  priority: z.enum(SUPPORT_PRIORITIES).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
});

export const ticketMessageSchema = z.object({
  domain: z.string().min(1).optional(),
  body: z.string().trim().min(1).max(8000),
});

export const kbUpsertSchema = z.object({
  domain: z.string().optional(),
  siteId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(4).max(200),
  bodyMd: z.string().max(20000),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});
