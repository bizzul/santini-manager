import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("OffertaTemplate");

/**
 * Template di righe base per categoria.
 *
 * Scelta la categoria in offerta, le posizioni ricorrenti arrivano gia'
 * scritte e all'utente restano solo misure e quantita'. I testi non sono
 * inventati: nelle 153 offerte Santini 2026 il blocco descrittivo
 * Aluplast/Siegenia/Secustik ricorre 44 volte e il Grauthoff 36.
 *
 * GET /api/listino/offerta-template
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { siteId } = await getSiteContext(req);
    if (!siteId) {
      return NextResponse.json({ error: "Site ID required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("offerta_template")
      .select(
        `id, categoria, nome, descrizione,
         offerta_template_riga (
           id, ordine, sell_product_id, descrizione, testo_base,
           unita, quantita_default, richiede_misure, attivo
         )`,
      )
      .eq("site_id", siteId)
      .eq("attivo", true)
      .order("categoria", { ascending: true })
      .order("nome", { ascending: true });

    if (error) {
      log.error("offerta-template error:", error);
      throw error;
    }

    const templates = (data ?? []).map((t: Record<string, unknown>) => {
      const righe = ((t.offerta_template_riga ?? []) as Record<
        string,
        unknown
      >[])
        .filter((r) => r.attivo !== false)
        .sort((a, b) => Number(a.ordine ?? 0) - Number(b.ordine ?? 0))
        .map((r) => ({
          id: String(r.id),
          sellProductId:
            r.sell_product_id != null ? Number(r.sell_product_id) : null,
          descrizione: String(r.descrizione ?? ""),
          testoBase: (r.testo_base as string | null) ?? null,
          unita: String(r.unita ?? "Pz."),
          quantitaDefault: Number(r.quantita_default ?? 1),
          richiedeMisure: Boolean(r.richiede_misure),
        }));

      return {
        id: String(t.id),
        categoria: String(t.categoria ?? ""),
        nome: String(t.nome ?? ""),
        descrizione: (t.descrizione as string | null) ?? null,
        righe,
      };
    });

    return NextResponse.json({ templates });
  } catch (err: unknown) {
    log.error("OffertaTemplate API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
