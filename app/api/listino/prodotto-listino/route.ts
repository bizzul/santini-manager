import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("ListinoProdottoListino");

/**
 * Restituisce i dati di listino associati a un prodotto, in base alla sua
 * modalita prezzo:
 *  - griglia         -> fasce di listino_griglia_base per la sua famiglia
 *  - misure_standard -> righe di listino_misure_standard del prodotto
 *  - fisso/mq/mc     -> riga singola di listino_fisso del prodotto
 *
 * GET /api/listino/prodotto-listino?sellProductId=...
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { siteId } = await getSiteContext(req);
    if (!siteId) {
      return NextResponse.json({ error: "Site ID required" }, { status: 400 });
    }

    const sellProductId = Number(
      req.nextUrl.searchParams.get("sellProductId") ?? "",
    );
    if (!Number.isFinite(sellProductId)) {
      return NextResponse.json(
        { error: "sellProductId non valido" },
        { status: 400 },
      );
    }

    const { data: prodotto, error: prodErr } = await supabase
      .from("SellProduct")
      .select("id, modalita_prezzo, famiglia_apertura_cod")
      .eq("site_id", siteId)
      .eq("id", sellProductId)
      .maybeSingle();

    if (prodErr) {
      log.error("prodotto-listino prodotto error:", prodErr);
      throw prodErr;
    }
    if (!prodotto) {
      return NextResponse.json(
        { error: "Prodotto non trovato" },
        { status: 404 },
      );
    }

    const famiglia = prodotto.famiglia_apertura_cod ?? null;

    const [grigliaRes, misureRes, fissoRes] = await Promise.all([
      famiglia
        ? supabase
            .from("listino_griglia_base")
            .select("*")
            .eq("site_id", siteId)
            .eq("famiglia_apertura_cod", famiglia)
            .order("larghezza_min_mm", { ascending: true })
            .order("altezza_min_mm", { ascending: true })
        : Promise.resolve({ data: [], error: null } as const),
      supabase
        .from("listino_misure_standard")
        .select("*")
        .eq("site_id", siteId)
        .eq("sell_product_id", sellProductId)
        .order("larghezza_mm", { ascending: true })
        .order("altezza_mm", { ascending: true }),
      supabase
        .from("listino_fisso")
        .select("*")
        .eq("site_id", siteId)
        .eq("sell_product_id", sellProductId)
        .maybeSingle(),
    ]);

    if (grigliaRes.error) throw grigliaRes.error;
    if (misureRes.error) throw misureRes.error;
    if (fissoRes.error) throw fissoRes.error;

    return NextResponse.json({
      modalitaPrezzo: prodotto.modalita_prezzo ?? null,
      famigliaAperturaCod: famiglia,
      griglia: grigliaRes.data ?? [],
      misure: misureRes.data ?? [],
      fisso: fissoRes.data ?? null,
    });
  } catch (err: unknown) {
    log.error("ListinoProdottoListino API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
