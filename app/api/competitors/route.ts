import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext, hasSiteId } from "@/lib/site-context";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("Task")
    .select("offer_loss_competitor_name")
    .eq("site_id", siteContext.siteId)
    .not("offer_loss_competitor_name", "is", null)
    .order("offer_loss_competitor_name", { ascending: true });

  if (error) {
    if (
      error.code === "42703" ||
      error.message?.includes("offer_loss_competitor_name")
    ) {
      return NextResponse.json({ competitors: [] });
    }
    return NextResponse.json(
      { error: "Impossibile caricare i competitor" },
      { status: 500 },
    );
  }

  const competitors = Array.from(
    new Set(
      (data || [])
        .map((row) => row.offer_loss_competitor_name?.trim())
        .filter(Boolean),
    ),
  );

  return NextResponse.json({ competitors });
}
