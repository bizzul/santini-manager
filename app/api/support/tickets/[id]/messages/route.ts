import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ticketMessageSchema } from "@/validation/support";
import { requireSupportSiteAccess } from "@/lib/support/auth";
import { mapMessage } from "@/lib/support/map";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const json = await request.json();
    const parsed = ticketMessageSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
    }
    if (!parsed.data.domain) {
      return NextResponse.json({ error: "domain richiesto" }, { status: 400 });
    }

    const auth = await requireSupportSiteAccess(parsed.data.domain, {
      requireEnabled: true,
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = await createClient();
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id, site_id, conversation_id, created_by, status")
      .eq("id", id)
      .maybeSingle();

    if (!ticket || (ticket.site_id !== auth.siteId && !auth.isSuperadmin)) {
      return NextResponse.json({ error: "Ticket non trovato" }, { status: 404 });
    }

    const isOwner = ticket.created_by === auth.userId;
    if (!isOwner && !auth.isSiteAdmin) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const role = auth.isSiteAdmin && !isOwner ? "agent" : isOwner ? "user" : "agent";

    const { data: message, error } = await supabase
      .from("support_messages")
      .insert({
        conversation_id: ticket.conversation_id,
        ticket_id: ticket.id,
        author_id: auth.userId,
        role,
        body: parsed.data.body,
      })
      .select("*")
      .single();

    if (error || !message) {
      return NextResponse.json(
        { error: error?.message || "Invio fallito" },
        { status: 500 },
      );
    }

    if (auth.isSiteAdmin && ticket.status === "open") {
      await supabase
        .from("support_tickets")
        .update({ status: "in_progress" })
        .eq("id", ticket.id);
    } else if (isOwner && ticket.status === "waiting_user") {
      await supabase
        .from("support_tickets")
        .update({ status: "in_progress" })
        .eq("id", ticket.id);
    }

    return NextResponse.json({
      message: mapMessage(message as Record<string, unknown>),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore messaggio",
      },
      { status: 500 },
    );
  }
}
