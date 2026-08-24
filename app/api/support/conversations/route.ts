import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createConversationSchema } from "@/validation/support";
import {
  allowSupportRateLimit,
  requireSupportSiteAccess,
} from "@/lib/support/auth";
import { sanitizeContext } from "@/lib/support/map";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = createConversationSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dati non validi", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const auth = await requireSupportSiteAccess(parsed.data.domain, {
      requireEnabled: true,
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!allowSupportRateLimit(`conv:${auth.userId}:${auth.siteId}`)) {
      return NextResponse.json(
        { error: "Troppe richieste. Riprova tra qualche minuto." },
        { status: 429 },
      );
    }

    const context = sanitizeContext(parsed.data.context, {
      assistanceLevel: auth.userContext.assistanceLevel,
    });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("support_conversations")
      .insert({
        site_id: auth.siteId,
        organization_id: auth.organizationId,
        created_by: auth.userId,
        status: "self_service",
        user_query: parsed.data.query,
        context,
      })
      .select("id, status, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Impossibile aprire la conversazione" },
        { status: 500 },
      );
    }

    await supabase.from("support_messages").insert({
      conversation_id: data.id,
      role: "user",
      author_id: auth.userId,
      body: parsed.data.query,
    });

    return NextResponse.json({
      conversationId: data.id,
      status: data.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Errore conversazione",
      },
      { status: 500 },
    );
  }
}
