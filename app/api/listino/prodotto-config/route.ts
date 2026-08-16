import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("ListinoProdottoConfig");

/**
 * Metadati di configurazione di un prodotto per il configuratore riga:
 * modalita prezzo, famiglia, coefficienti disponibili e supplementi applicabili
 * alla categoria del prodotto.
 * GET /api/listino/prodotto-config?sellProductId=...
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
      .select(
        "id, name, internal_code, modalita_prezzo, famiglia_apertura_cod, cod_materiale, cod_vetro_telaio, cod_tipo_cassone, image_url, width_mm, height_mm, depth_mm, category:sellproduct_categories(name)",
      )
      .eq("site_id", siteId)
      .eq("id", sellProductId)
      .maybeSingle();

    if (prodErr) {
      log.error("prodotto-config prodotto error:", prodErr);
      throw prodErr;
    }
    if (!prodotto) {
      return NextResponse.json(
        { error: "Prodotto non trovato" },
        { status: 404 },
      );
    }

    const categoria = (prodotto as any).category?.name ?? null;

    const { data: coeffData, error: coeffErr } = await supabase
      .from("listino_coefficienti")
      .select("categoria, codice, descrizione, moltiplicatore")
      .eq("site_id", siteId)
      .eq("attivo", true)
      .order("codice", { ascending: true });

    if (coeffErr) {
      log.error("prodotto-config coefficienti error:", coeffErr);
      throw coeffErr;
    }

    const materiale = (coeffData ?? []).filter((c) =>
      ["materiale_serramento", "materiale_porta", "materiale_arredamento"].includes(
        c.categoria,
      ),
    );
    const vetroTelaio = (coeffData ?? []).filter((c) =>
      ["vetro", "telaio"].includes(c.categoria),
    );
    const esecuzioneAnte = (coeffData ?? []).filter(
      (c) => c.categoria === "esecuzione_ante",
    );
    const tipoCassone = (coeffData ?? []).filter(
      (c) => c.categoria === "tipo_cassone",
    );

    // Incrementi dimensionali applicabili (per la famiglia del prodotto).
    let incrementi: { dimensione: string }[] = [];
    if (prodotto.famiglia_apertura_cod) {
      const { data: incData, error: incErr } = await supabase
        .from("listino_incrementi_dimensionali")
        .select("dimensione")
        .eq("site_id", siteId)
        .eq("famiglia_prodotto_cod", prodotto.famiglia_apertura_cod)
        .eq("attivo", true);
      if (incErr) {
        log.error("prodotto-config incrementi error:", incErr);
      } else {
        incrementi = incData ?? [];
      }
    }
    const dimensioniIncremento = Array.from(
      new Set(incrementi.map((i) => i.dimensione)),
    );

    // Supplementi applicabili: quelli con categoria = categoria prodotto o 'tutte'.
    const categorieFiltro = ["tutte", ...(categoria ? [categoria] : [])];
    const { data: suppData, error: suppErr } = await supabase
      .from("supplementi")
      .select(
        "id, codice, nome, descrizione, tipo_calcolo, valore, attivo, supplementi_categorie!inner(categoria)",
      )
      .eq("site_id", siteId)
      .eq("attivo", true)
      .in("supplementi_categorie.categoria", categorieFiltro);

    if (suppErr) {
      log.error("prodotto-config supplementi error:", suppErr);
      throw suppErr;
    }

    const seen = new Set<string>();
    const supplementi = (suppData ?? [])
      .filter((s: any) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      })
      .map((s: any) => ({
        id: s.id,
        codice: s.codice,
        nome: s.nome,
        descrizione: s.descrizione ?? null,
        tipoCalcolo: s.tipo_calcolo,
        valore: Number(s.valore),
      }));

    return NextResponse.json({
      prodotto: {
        id: prodotto.id,
        name: prodotto.name,
        internalCode: prodotto.internal_code ?? null,
        modalitaPrezzo: prodotto.modalita_prezzo ?? null,
        famigliaAperturaCod: prodotto.famiglia_apertura_cod ?? null,
        codMateriale: prodotto.cod_materiale ?? null,
        codVetroTelaio: prodotto.cod_vetro_telaio ?? null,
        codTipoCassone: prodotto.cod_tipo_cassone ?? null,
        imageUrl: prodotto.image_url ?? null,
        larghezzaDefaultMm: prodotto.width_mm ?? null,
        altezzaDefaultMm: prodotto.height_mm ?? null,
        profonditaDefaultMm: prodotto.depth_mm ?? null,
        categoria,
      },
      coefficienti: { materiale, vetroTelaio, esecuzioneAnte, tipoCassone },
      dimensioniIncremento,
      supplementi,
    });
  } catch (err: unknown) {
    log.error("ListinoProdottoConfig API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
