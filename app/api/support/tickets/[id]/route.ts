import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { patchTicketSchema } from "@/validation/support";
import { requireSupportSiteAccess } from "@/lib/support/auth";
import { mapMessage, mapTicketListItem } from "@/lib/support/map";
import type { SupportClientContext } from "@/lib/support/types";

export const dynamic = "force-dynamic";

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

async function loadTicket(id: string) {
  const supabase = await createClient();
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select(TICKET_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !ticket) return { ticket: null, error: error?.message };
  return { ticket, error: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const domain = request.nextUrl.searchParams.get("domain");
    if (!domain) {
      return NextResponse.json({ error: "domain richiesto" }, { status: 400 });
    }

    const auth = await requireSupportSiteAccess(domain);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const loaded = await loadTicket(id);
    if (!loaded.ticket) {
      return NextResponse.json({ error: "Ticket non trovato" }, { status: 404 });
    }

    const item = mapTicketListItem(loaded.ticket as Record<string, unknown>);
    if (item.siteId !== auth.siteId && !auth.isSuperadmin) {
      return NextResponse.json({ error: "Ticket non trovato" }, { status: 404 });
    }

    const supabase = await createClient();
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

    return NextResponse.json({
      ticket: {
        ...item,
        kbAttempted: Boolean(
          (loaded.ticket as { kb_attempted?: boolean }).kb_attempted,
        ),
        kbArticleIds:
          ((loaded.ticket as { kb_article_ids?: string[] }).kb_article_ids) ??
          [],
        messages: (messages ?? []).map((row) =>
          mapMessage(row as Record<string, unknown>),
        ),
        context:
          ((conversation?.context as SupportClientContext | null) ?? {}),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore ticket",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const json = await request.json();
    const parsed = patchTicketSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
    }
    if (!parsed.data.domain) {
      return NextResponse.json({ error: "domain richiesto" }, { status: 400 });
    }

    const auth = await requireSupportSiteAccess(parsed.data.domain);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (!auth.isSiteAdmin) {
      return NextResponse.json({ error: "Solo admin" }, { status: 403 });
    }

    const loaded = await loadTicket(id);
    if (!loaded.ticket) {
      return NextResponse.json({ error: "Ticket non trovato" }, { status: 404 });
    }
    const current = mapTicketListItem(loaded.ticket as Record<string, unknown>);
    if (current.siteId !== auth.siteId && !auth.isSuperadmin) {
      return NextResponse.json({ error: "Ticket non trovato" }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};
    if (parsed.data.status) {
      patch.status = parsed.data.status;
      if (parsed.data.status === "resolved") {
        patch.resolved_at = new Date().toISOString();
      }
      if (parsed.data.status === "closed") {
        patch.closed_at = new Date().toISOString();
      }
    }
    if (parsed.data.priority) patch.priority = parsed.data.priority;
    if (parsed.data.assignedTo !== undefined) {
      patch.assigned_to = parsed.data.assignedTo;
    }
    if (parsed.data.categoryId !== undefined) {
      patch.category_id = parsed.data.categoryId;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("support_tickets")
      .update(patch)
      .eq("id", id)
      .select(TICKET_SELECT)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Aggiornamento fallito" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ticket: mapTicketListItem(data as Record<string, unknown>),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore aggiornamento",
      },
      { status: 500 },
    );
  }
}
