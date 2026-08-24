export type SupportMessageRole = "user" | "bot" | "agent" | "system";

export type SupportConversationStatus =
  | "self_service"
  | "escalated"
  | "abandoned";

export type SupportKbStatus = "draft" | "published" | "archived";

export type SupportAttachment = {
  path: string;
  mime: string;
  size: number;
  kind: "screenshot" | "file";
};

export type SupportErrorSample = {
  message: string;
  stack?: string;
  digest?: string;
  at: string;
};

export type SupportClientContext = {
  pathname?: string;
  search?: string;
  module?: string;
  userAgent?: string;
  viewport?: { width: number; height: number };
  locale?: string;
  assistanceLevel?: string;
  errorDigest?: string;
  recentErrors?: SupportErrorSample[];
  source?: "widget" | "error_boundary" | "admin";
};

export type SupportKbHit = {
  id: string;
  title: string;
  bodyMd: string;
  rank: number;
  trgmSim: number;
  excerpt?: string;
};

export type SupportMessage = {
  id: string;
  conversationId: string;
  ticketId: string | null;
  authorId: string | null;
  role: SupportMessageRole;
  body: string;
  kbArticleIds: string[];
  attachments: SupportAttachment[];
  createdAt: string;
};

export type SupportTicketListItem = {
  id: string;
  publicNumber: number;
  siteId: string;
  siteName?: string | null;
  siteSubdomain?: string | null;
  conversationId: string;
  categoryId: string | null;
  categoryLabel?: string | null;
  createdBy: string;
  assignedTo: string | null;
  status: string;
  priority: string;
  source: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
};

export type SupportTicketDetail = SupportTicketListItem & {
  kbAttempted: boolean;
  kbArticleIds: string[];
  messages: SupportMessage[];
  context: SupportClientContext;
};
