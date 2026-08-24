import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { requireSupportSiteAccess } from "@/lib/support/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const domain = request.nextUrl.searchParams.get("domain");
    if (!domain) {
      return NextResponse.json({ error: "domain richiesto" }, { status: 400 });
    }
    const auth = await requireSupportSiteAccess(domain);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("support_categories")
      .select("id, site_id, slug, label, sort_order")
      .eq("is_active", true)
      .or(`site_id.is.null,site_id.eq.${auth.siteId}`)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore categorie",
      },
      { status: 500 },
    );
  }
}
