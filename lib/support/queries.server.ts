import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { mapMessage, mapTicketListItem } from "@/lib/support/map";
import type {
  SupportClientContext,
  SupportTicketDetail,
  SupportTicketListItem,
} from "@/lib/support/types";

const TICKET_SELECT = `
  id,
  public_number,
  site_id,
  conversation_id,
  category_id,
  created_by,
  assigned_to,
  status,
  priority,
  source,
  subject,
  kb_attempted,
  kb_article_ids,
  created_at,
  updated_at,
  support_categories:category_id ( label ),
  sites:site_id ( name, subdomain )
`;

export const listSupportTickets = cache(async function listSupportTickets(opts: {
  siteId?: string;
  createdBy?: string;
  status?: string;
}): Promise<SupportTicketListItem[]> {
  const supabase = await createClient();
  let query = supabase.from("support_tickets").select(TICKET_SELECT);
  if (opts.siteId) query = query.eq("site_id", opts.siteId);
  if (opts.createdBy) query = query.eq("created_by", opts.createdBy);
  if (opts.status) query = query.eq("status", opts.status);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[support] list tickets", error);
    return [];
  }
  return (data ?? []).map((row) =>
    mapTicketListItem(row as Record<string, unknown>),
  );
});

export const getSupportTicketDetail = cache(async function getSupportTicketDetail(
  id: string,
): Promise<SupportTicketDetail | null> {
  const supabase = await createClient();
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select(TICKET_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!ticket) return null;

  const item = mapTicketListItem(ticket as Record<string, unknown>);
  const [{ data: messages }, { data: conversation }] = await Promise.all([
    supabase
      .from("support_messages")
      .select("*")
      .eq("conversation_id", item.conversationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("support_conversations")
      .select("context")
      .eq("id", item.conversationId)
      .maybeSingle(),
  ]);

  return {
    ...item,
    kbAttempted: Boolean((ticket as { kb_attempted?: boolean }).kb_attempted),
    kbArticleIds: ((ticket as { kb_article_ids?: string[] }).kb_article_ids) ?? [],
    messages: (messages ?? []).map((row) =>
      mapMessage(row as Record<string, unknown>),
    ),
    context: ((conversation?.context as SupportClientContext | null) ?? {}),
  };
});

export async function listKbArticles(opts: {
  siteId?: string | null;
  globalOnly?: boolean;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("support_kb_articles")
    .select(
      "id, site_id, category_id, title, body_md, tags, status, source_ticket_id, published_at, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  if (opts.globalOnly) {
    query = query.is("site_id", null);
  } else if (opts.siteId) {
    query = query.or(`site_id.is.null,site_id.eq.${opts.siteId}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[support] list kb", error);
    return [];
  }

  const ids = (data ?? []).map((row: { id: string }) => row.id);
  const stats: Record<string, { yes: number; no: number }> = {};
  if (ids.length > 0) {
    const { data: statRows } = await supabase
      .from("support_kb_article_stats")
      .select("id, resolved_yes, resolved_no")
      .in("id", ids);
    for (const row of statRows ?? []) {
      stats[row.id] = {
        yes: Number(row.resolved_yes ?? 0),
        no: Number(row.resolved_no ?? 0),
      };
    }
  }

  return (data ?? []).map((row) => ({
    ...row,
    stats: stats[row.id] ?? { yes: 0, no: 0 },
  }));
}

export async function countOpenTickets(siteId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .eq("site_id", siteId)
    .in("status", ["open", "in_progress"]);
  return count ?? 0;
}
