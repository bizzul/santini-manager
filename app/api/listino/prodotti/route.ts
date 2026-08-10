import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("ListinoProdotti");

/**
 * Ricerca prodotti a listino per il configuratore riga da catalogo.
 * GET /api/listino/prodotti?q=...
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { siteId } = await getSiteContext(req);
    if (!siteId) {
      return NextResponse.json({ error: "Site ID required" }, { status: 400 });
    }

    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    if (q.length < 2) {
      return NextResponse.json({ prodotti: [] });
    }

    const pattern = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    const { data, error } = await supabase
      .from("SellProduct")
      .select(
        "id, name, internal_code, modalita_prezzo, famiglia_apertura_cod, image_url, category:sellproduct_categories(name)",
      )
      .eq("site_id", siteId)
      .eq("active", true)
      .or(
        `name.ilike.${pattern},internal_code.ilike.${pattern},description.ilike.${pattern}`,
      )
      .order("name", { ascending: true })
      .limit(15);

    if (error) {
      log.error("ricerca prodotti error:", error);
      throw error;
    }

    const prodotti = (data ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      internalCode: p.internal_code ?? null,
      modalitaPrezzo: p.modalita_prezzo ?? null,
      famigliaAperturaCod: p.famiglia_apertura_cod ?? null,
      imageUrl: p.image_url ?? null,
      categoria: p.category?.name ?? null,
    }));

    return NextResponse.json({ prodotti });
  } catch (err: unknown) {
    log.error("ListinoProdotti API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
