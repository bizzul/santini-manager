import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { kbUpsertSchema } from "@/validation/support";
import {
  requireSupportSiteAccess,
  requireSupportSuperadmin,
} from "@/lib/support/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const domain = request.nextUrl.searchParams.get("domain");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("support_kb_articles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Articolo non trovato" }, { status: 404 });
    }

    if (data.site_id) {
      if (!domain) {
        return NextResponse.json({ error: "domain richiesto" }, { status: 400 });
      }
      const auth = await requireSupportSiteAccess(domain);
      if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
    } else {
      const auth = await requireSupportSuperadmin();
      if (!auth.ok && data.status !== "published") {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
      }
    }

    return NextResponse.json({ article: data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore articolo",
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
    const parsed = kbUpsertSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("support_kb_articles")
      .select("id, site_id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Articolo non trovato" }, { status: 404 });
    }

    let userId: string;
    if (!existing.site_id) {
      const auth = await requireSupportSuperadmin();
      if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
      userId = auth.userId;
    } else {
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
      userId = auth.userId;
    }

    const status = parsed.data.status ?? "draft";
    const { data, error } = await supabase
      .from("support_kb_articles")
      .update({
        category_id: parsed.data.categoryId ?? null,
        title: parsed.data.title,
        body_md: parsed.data.bodyMd,
        tags: parsed.data.tags ?? [],
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
        updated_by: userId,
      })
      .eq("id", id)
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Salvataggio fallito" },
        { status: 500 },
      );
    }

    return NextResponse.json({ articleId: data.id });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore articolo",
      },
      { status: 500 },
    );
  }
}
