import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { searchSupportSchema } from "@/validation/support";
import {
  allowSupportRateLimit,
  requireSupportSiteAccess,
} from "@/lib/support/auth";
import { searchSupportKb } from "@/lib/support/search";
import { reformulateKbAnswer } from "@/lib/support/reformulate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = searchSupportSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dati non validi" },
        { status: 400 },
      );
    }

    const auth = await requireSupportSiteAccess(parsed.data.domain, {
      requireEnabled: true,
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!allowSupportRateLimit(`search:${auth.userId}:${auth.siteId}`)) {
      return NextResponse.json(
        { error: "Troppe ricerche. Riprova tra qualche minuto." },
        { status: 429 },
      );
    }

    const supabase = await createClient();
    const { data: conversation } = await supabase
      .from("support_conversations")
      .select("id, created_by, site_id")
      .eq("id", parsed.data.conversationId)
      .maybeSingle();

    if (!conversation || conversation.site_id !== auth.siteId) {
      return NextResponse.json(
        { error: "Conversazione non trovata" },
        { status: 404 },
      );
    }
    if (conversation.created_by !== auth.userId && !auth.isSiteAdmin) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const hits = await searchSupportKb(auth.siteId, parsed.data.query, 3);

    if (hits.length === 0) {
      await supabase.from("support_messages").insert({
        conversation_id: parsed.data.conversationId,
        role: "bot",
        author_id: auth.userId,
        body:
          "Non ho trovato una soluzione già documentata. Se vuoi, apro un ticket di supporto con il contesto di questa schermata.",
        kb_article_ids: [],
      });

      return NextResponse.json({
        mode: "need_ticket",
        reply:
          "Non ho trovato una soluzione già documentata. Se vuoi, apro un ticket di supporto con il contesto di questa schermata.",
        articles: [],
      });
    }

    const reformulated = await reformulateKbAnswer(parsed.data.query, hits);
    const articles = hits.filter((hit) =>
      reformulated.articleIds.includes(hit.id),
    );
    const shown = articles.length > 0 ? articles : hits;

    if (reformulated.mode === "need_ticket") {
      await supabase.from("support_messages").insert({
        conversation_id: parsed.data.conversationId,
        role: "bot",
        author_id: auth.userId,
        body:
          reformulated.reply ||
          "Gli articoli trovati non coprono questo caso. Procediamo con un ticket.",
        kb_article_ids: shown.map((hit) => hit.id),
      });

      return NextResponse.json({
        mode: "need_ticket",
        reply:
          reformulated.reply ||
          "Gli articoli trovati non coprono questo caso. Procediamo con un ticket.",
        articles: shown.map((hit) => ({
          id: hit.id,
          title: hit.title,
          excerpt: hit.excerpt,
        })),
      });
    }

    await supabase.from("support_messages").insert({
      conversation_id: parsed.data.conversationId,
      role: "bot",
      author_id: auth.userId,
      body: reformulated.reply,
      kb_article_ids: shown.map((hit) => hit.id),
    });

    return NextResponse.json({
      mode: "answer",
      reply: reformulated.reply,
      articles: shown.map((hit) => ({
        id: hit.id,
        title: hit.title,
        excerpt: hit.excerpt,
        bodyMd: hit.bodyMd,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore ricerca KB",
      },
      { status: 500 },
    );
  }
}
