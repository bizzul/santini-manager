import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { requireSupportSiteAccess } from "@/lib/support/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const json = (await request.json()) as { domain?: string };
    if (!json.domain) {
      return NextResponse.json({ error: "domain richiesto" }, { status: 400 });
    }

    const auth = await requireSupportSiteAccess(json.domain);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (!auth.isSiteAdmin) {
      return NextResponse.json({ error: "Solo admin" }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id, site_id, conversation_id, subject")
      .eq("id", id)
      .maybeSingle();

    if (!ticket || (ticket.site_id !== auth.siteId && !auth.isSuperadmin)) {
      return NextResponse.json({ error: "Ticket non trovato" }, { status: 404 });
    }

    const { data: messages } = await supabase
      .from("support_messages")
      .select("role, body")
      .eq("conversation_id", ticket.conversation_id)
      .in("role", ["user", "agent"])
      .order("created_at", { ascending: true });

    const lastAgent = [...(messages ?? [])]
      .reverse()
      .find((row: { role: string }) => row.role === "agent");

    const thread = (messages ?? [])
      .map((row: { role: string; body: string }) => `**${row.role}:** ${row.body}`)
      .join("\n\n");

    const bodyMd = lastAgent?.body || thread || ticket.subject;

    const { data: article, error } = await supabase
      .from("support_kb_articles")
      .insert({
        site_id: ticket.site_id,
        title: ticket.subject,
        body_md: bodyMd,
        tags: [],
        status: "draft",
        source_ticket_id: ticket.id,
        created_by: auth.userId,
        updated_by: auth.userId,
      })
      .select("id")
      .single();

    if (error || !article) {
      return NextResponse.json(
        { error: error?.message || "Conversione fallita" },
        { status: 500 },
      );
    }

    await supabase.from("support_ticket_events").insert({
      ticket_id: ticket.id,
      actor_id: auth.userId,
      event_type: "kb_convert",
      to_value: article.id,
    });

    return NextResponse.json({ articleId: article.id });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore conversione KB",
      },
      { status: 500 },
    );
  }
}
