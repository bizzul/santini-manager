import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  createTicketSchema,
  listTicketsQuerySchema,
} from "@/validation/support";
import {
  requireSupportSiteAccess,
  requireSupportSuperadmin,
} from "@/lib/support/auth";
import { mapTicketListItem } from "@/lib/support/map";
import { formatTicketNumber } from "@/lib/support/settings";

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
  created_at,
  updated_at,
  support_categories:category_id ( label ),
  sites:site_id ( name, subdomain )
`;

export async function GET(request: NextRequest) {
  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = listTicketsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Query non valida" }, { status: 400 });
    }

    const scope = parsed.data.scope ?? "mine";
    const supabase = await createClient();
    let query = supabase.from("support_tickets").select(TICKET_SELECT);

    if (scope === "all") {
      const auth = await requireSupportSuperadmin();
      if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
    } else {
      if (!parsed.data.domain) {
        return NextResponse.json({ error: "domain richiesto" }, { status: 400 });
      }
      const auth = await requireSupportSiteAccess(parsed.data.domain, {
        requireEnabled: true,
      });
      if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
      query = query.eq("site_id", auth.siteId);
      if (scope === "mine" || !auth.isSiteAdmin) {
        query = query.eq("created_by", auth.userId);
      }
    }

    if (parsed.data.status) query = query.eq("status", parsed.data.status);
    if (parsed.data.priority) query = query.eq("priority", parsed.data.priority);
    if (parsed.data.categoryId) {
      query = query.eq("category_id", parsed.data.categoryId);
    }
    if (parsed.data.q) {
      query = query.ilike("subject", `%${parsed.data.q}%`);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tickets = (data ?? []).map((row) =>
      mapTicketListItem(row as Record<string, unknown>),
    );

    return NextResponse.json({ tickets });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore lista ticket",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = createTicketSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
    }

    const auth = await requireSupportSiteAccess(parsed.data.domain, {
      requireEnabled: true,
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = await createClient();
    const { data: conversation } = await supabase
      .from("support_conversations")
      .select("id, created_by, site_id, user_query, context")
      .eq("id", parsed.data.conversationId)
      .maybeSingle();

    if (!conversation || conversation.site_id !== auth.siteId) {
      return NextResponse.json(
        { error: "Conversazione non trovata" },
        { status: 404 },
      );
    }
    if (conversation.created_by !== auth.userId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const { data: existing } = await supabase
      .from("support_tickets")
      .select(TICKET_SELECT)
      .eq("conversation_id", conversation.id)
      .maybeSingle();

    if (existing) {
      const ticket = mapTicketListItem(existing as Record<string, unknown>);
      return NextResponse.json({
        ticket,
        number: formatTicketNumber(ticket.publicNumber),
      });
    }

    const { data: kbMessages } = await supabase
      .from("support_messages")
      .select("kb_article_ids")
      .eq("conversation_id", conversation.id)
      .not("kb_article_ids", "eq", "{}");

    const kbIds = Array.from(
      new Set(
        (kbMessages ?? []).flatMap((row: { kb_article_ids?: string[] }) =>
          row.kb_article_ids ?? [],
        ),
      ),
    );

    const { data: created, error } = await supabase
      .from("support_tickets")
      .insert({
        site_id: auth.siteId,
        organization_id: auth.organizationId,
        conversation_id: conversation.id,
        category_id: parsed.data.categoryId ?? null,
        created_by: auth.userId,
        status: "open",
        priority: parsed.data.priority ?? "normal",
        source: parsed.data.source ?? "widget",
        subject: parsed.data.subject,
        kb_attempted: kbIds.length > 0,
        kb_article_ids: kbIds,
      })
      .select(TICKET_SELECT)
      .single();

    if (error || !created) {
      return NextResponse.json(
        { error: error?.message || "Impossibile creare il ticket" },
        { status: 500 },
      );
    }

    await supabase
      .from("support_conversations")
      .update({ status: "escalated" })
      .eq("id", conversation.id);

    if (parsed.data.details) {
      await supabase.from("support_messages").insert({
        conversation_id: conversation.id,
        ticket_id: created.id,
        role: "user",
        author_id: auth.userId,
        body: parsed.data.details,
      });
    }

    await supabase.from("support_messages").insert({
      conversation_id: conversation.id,
      ticket_id: created.id,
      role: "system",
      author_id: auth.userId,
      body: `Ticket ${formatTicketNumber(created.public_number)} aperto.`,
    });

    const ticket = mapTicketListItem(created as Record<string, unknown>);
    await forwardWebhook({
      ticket,
      details: parsed.data.details,
      userEmail: auth.userContext.user?.email ?? null,
      role: auth.userContext.role,
      appPath:
        (conversation.context as { pathname?: string } | null)?.pathname ??
        null,
    });

    return NextResponse.json({
      ticket,
      number: formatTicketNumber(ticket.publicNumber),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore creazione ticket",
      },
      { status: 500 },
    );
  }
}

async function forwardWebhook(payload: {
  ticket: ReturnType<typeof mapTicketListItem>;
  details?: string;
  userEmail: string | null;
  role: string;
  appPath: string | null;
}) {
  const webhookUrl = process.env.SUPPORT_TICKET_WEBHOOK_URL;
  const webhookToken = process.env.SUPPORT_TICKET_WEBHOOK_TOKEN;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
      },
      body: JSON.stringify({
        source: "assistbot",
        createdAt: new Date().toISOString(),
        subject: payload.ticket.subject,
        details: payload.details ?? payload.ticket.subject,
        ticketNumber: formatTicketNumber(payload.ticket.publicNumber),
        ticketId: payload.ticket.id,
        appPath: payload.appPath,
        user: {
          email: payload.userEmail,
          role: payload.role,
        },
      }),
    });
  } catch (error) {
    console.error("[support] webhook failed", error);
  }
}
