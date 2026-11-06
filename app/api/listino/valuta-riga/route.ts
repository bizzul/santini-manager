import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { logger } from "@/lib/logger";
import type { PricingInput } from "@/lib/listino/calcola-prezzo";
import { createSupabaseListinoDataSource } from "@/lib/listino/supabase-data-source";
import { valutaRiga } from "@/lib/listino/valuta-riga";

const log = logger.scope("ListinoValutaRiga");

function num(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

/**
 * Valuta una riga d'offerta senza mai fallire sul prezzo mancante.
 *
 * A differenza di /api/listino/calcola-prezzo, che risponde 422 quando il
 * motore non sa quotare, questo endpoint risponde sempre 200 con lo stato
 * della riga e gli avvisi: serve alle schermate che mostrano piu' posizioni
 * insieme, dove la prima posizione non quotabile non deve nascondere le altre.
 *
 * POST /api/listino/valuta-riga
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { siteId } = await getSiteContext(req);
    if (!siteId) {
      return NextResponse.json({ error: "Site ID required" }, { status: 400 });
    }

    const body = await req.json();
    const input: PricingInput = {
      sellProductId: num(body.sellProductId),
      internalCode: str(body.internalCode) ?? undefined,
      larghezzaMm: num(body.larghezzaMm),
      altezzaMm: num(body.altezzaMm),
      profonditaMm: num(body.profonditaMm),
      codMateriale: str(body.codMateriale),
      codVetroTelaio: str(body.codVetroTelaio),
      codEsecuzioneAnte: str(body.codEsecuzioneAnte),
      codTipoCassone: str(body.codTipoCassone),
      supplementoIds: Array.isArray(body.supplementoIds)
        ? body.supplementoIds.map(String)
        : [],
      quantita: num(body.quantita),
    };

    const dataSource = createSupabaseListinoDataSource(supabase, siteId);
    const riga = await valutaRiga(input, dataSource, {
      prezzoForzato: num(body.prezzoForzato) ?? null,
    });

    return NextResponse.json({ riga });
  } catch (err: unknown) {
    log.error("ListinoValutaRiga API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
