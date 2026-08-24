import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { kbUpsertSchema } from "@/validation/support";
import {
  requireSupportSiteAccess,
  requireSupportSuperadmin,
} from "@/lib/support/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const domain = request.nextUrl.searchParams.get("domain");
    const scope = request.nextUrl.searchParams.get("scope") ?? "site";
    const supabase = await createClient();

    let query = supabase
      .from("support_kb_articles")
      .select(
        "id, site_id, category_id, title, body_md, tags, status, source_ticket_id, published_at, updated_at",
      )
      .order("updated_at", { ascending: false });

    if (scope === "global") {
      const auth = await requireSupportSuperadmin();
      if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
      query = query.is("site_id", null);
    } else {
      if (!domain) {
        return NextResponse.json({ error: "domain richiesto" }, { status: 400 });
      }
      const auth = await requireSupportSiteAccess(domain);
      if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
      if (!auth.isSiteAdmin) {
        query = query.eq("status", "published");
      }
      query = query.or(`site_id.is.null,site_id.eq.${auth.siteId}`);
    }

    const { data, error } = await query.limit(200);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const ids = (data ?? []).map((row: { id: string }) => row.id);
    let stats: Record<string, { yes: number; no: number }> = {};
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

    return NextResponse.json({
      articles: (data ?? []).map((row) => ({
        ...row,
        stats: stats[row.id] ?? { yes: 0, no: 0 },
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore KB",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = kbUpsertSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
    }

    const wantsGlobal = parsed.data.siteId === null && !parsed.data.domain;
    let siteId: string | null = parsed.data.siteId ?? null;
    let userId: string;

    if (wantsGlobal || parsed.data.siteId === null) {
      const auth = await requireSupportSuperadmin();
      if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
      userId = auth.userId;
      siteId = null;
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
      siteId = auth.siteId;
    }

    const status = parsed.data.status ?? "draft";
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("support_kb_articles")
      .insert({
        site_id: siteId,
        category_id: parsed.data.categoryId ?? null,
        title: parsed.data.title,
        body_md: parsed.data.bodyMd,
        tags: parsed.data.tags ?? [],
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
        created_by: userId,
        updated_by: userId,
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Creazione fallita" },
        { status: 500 },
      );
    }

    return NextResponse.json({ articleId: data.id });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore KB",
      },
      { status: 500 },
    );
  }
}
