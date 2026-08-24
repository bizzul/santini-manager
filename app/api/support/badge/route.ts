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
    if (!auth.isSiteAdmin) {
      return NextResponse.json({ count: 0 });
    }

    const supabase = await createClient();
    const { count, error } = await supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("site_id", auth.siteId)
      .in("status", ["open", "in_progress"]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore badge",
      },
      { status: 500 },
    );
  }
}
