import type {
  SupportAttachment,
  SupportClientContext,
  SupportMessage,
  SupportTicketListItem,
} from "@/lib/support/types";

function asAttachments(value: unknown): SupportAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SupportAttachment => {
    return Boolean(
      item &&
        typeof item === "object" &&
        typeof (item as SupportAttachment).path === "string",
    );
  });
}

export function mapMessage(row: Record<string, unknown>): SupportMessage {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    ticketId: (row.ticket_id as string | null) ?? null,
    authorId: (row.author_id as string | null) ?? null,
    role: row.role as SupportMessage["role"],
    body: String(row.body ?? ""),
    kbArticleIds: Array.isArray(row.kb_article_ids)
      ? (row.kb_article_ids as string[])
      : [],
    attachments: asAttachments(row.attachments),
    createdAt: String(row.created_at),
  };
}

export function mapTicketListItem(
  row: Record<string, unknown>,
): SupportTicketListItem {
  const category = row.support_categories as
    | { label?: string }
    | { label?: string }[]
    | null;
  const categoryLabel = Array.isArray(category)
    ? category[0]?.label
    : category?.label;
  const site = row.sites as
    | { name?: string; subdomain?: string }
    | { name?: string; subdomain?: string }[]
    | null;
  const siteName = Array.isArray(site) ? site[0]?.name : site?.name;
  const siteSubdomain = Array.isArray(site)
    ? site[0]?.subdomain
    : site?.subdomain;

  return {
    id: String(row.id),
    publicNumber: Number(row.public_number),
    siteId: String(row.site_id),
    siteName: siteName ?? null,
    siteSubdomain: siteSubdomain ?? null,
    conversationId: String(row.conversation_id),
    categoryId: (row.category_id as string | null) ?? null,
    categoryLabel: categoryLabel ?? null,
    createdBy: String(row.created_by),
    assignedTo: (row.assigned_to as string | null) ?? null,
    status: String(row.status),
    priority: String(row.priority),
    source: String(row.source),
    subject: String(row.subject),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function sanitizeContext(
  context: SupportClientContext | undefined,
  extras: { assistanceLevel?: string; locale?: string },
): SupportClientContext {
  const recent = (context?.recentErrors ?? []).slice(0, 10).map((item) => ({
    message: item.message.slice(0, 2000),
    stack: item.stack?.slice(0, 4000),
    digest: item.digest,
    at: item.at,
  }));

  return {
    pathname: context?.pathname?.slice(0, 500),
    search: context?.search?.slice(0, 500),
    module: context?.module?.slice(0, 80),
    userAgent: context?.userAgent?.slice(0, 500),
    viewport: context?.viewport,
    locale: extras.locale ?? context?.locale,
    assistanceLevel: extras.assistanceLevel ?? context?.assistanceLevel,
    errorDigest: context?.errorDigest,
    recentErrors: recent,
    source: context?.source ?? "widget",
  };
}
