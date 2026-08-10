import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { logger } from "@/lib/logger";
import {
  calcolaPrezzo,
  ListinoPricingError,
  type PricingInput,
} from "@/lib/listino/calcola-prezzo";
import { createSupabaseListinoDataSource } from "@/lib/listino/supabase-data-source";

const log = logger.scope("ListinoCalcolaPrezzo");

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Calcola il prezzo di una riga configurata usando il motore Fase 3.
 * POST /api/listino/calcola-prezzo
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
      sellProductId: toNumberOrUndefined(body.sellProductId),
      internalCode:
        typeof body.internalCode === "string" ? body.internalCode : undefined,
      larghezzaMm: toNumberOrUndefined(body.larghezzaMm),
      altezzaMm: toNumberOrUndefined(body.altezzaMm),
      profonditaMm: toNumberOrUndefined(body.profonditaMm),
      codMateriale:
        typeof body.codMateriale === "string" && body.codMateriale
          ? body.codMateriale
          : null,
      codVetroTelaio:
        typeof body.codVetroTelaio === "string" && body.codVetroTelaio
          ? body.codVetroTelaio
          : null,
      supplementoIds: Array.isArray(body.supplementoIds)
        ? body.supplementoIds.map(String)
        : [],
      quantita: toNumberOrUndefined(body.quantita),
    };

    const dataSource = createSupabaseListinoDataSource(supabase, siteId);
    const breakdown = await calcolaPrezzo(input, dataSource);

    return NextResponse.json({ breakdown });
  } catch (err: unknown) {
    if (err instanceof ListinoPricingError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 422 },
      );
    }
    log.error("ListinoCalcolaPrezzo API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
