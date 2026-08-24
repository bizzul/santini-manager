import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { feedbackSupportSchema } from "@/validation/support";
import { requireSupportSiteAccess } from "@/lib/support/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = feedbackSupportSchema.safeParse(json);
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
    const { error } = await supabase.from("support_kb_feedback").insert({
      article_id: parsed.data.articleId,
      site_id: auth.siteId,
      user_id: auth.userId,
      conversation_id: parsed.data.conversationId,
      resolved: parsed.data.resolved,
    });

    if (error && error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (parsed.data.resolved) {
      await supabase.from("support_conversations").update({
        status: "abandoned",
      }).eq("id", parsed.data.conversationId);

      await supabase.from("support_messages").insert({
        conversation_id: parsed.data.conversationId,
        role: "system",
        author_id: auth.userId,
        body: "L'utente ha indicato che l'articolo ha risolto il problema. Nessun ticket aperto.",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore feedback",
      },
      { status: 500 },
    );
  }
}
