/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  calcolaPrezzo,
  ListinoPricingError,
  type ListinoDataSource,
} from "@/lib/listino/calcola-prezzo";
import { createSupabaseListinoDataSource } from "@/lib/listino/supabase-data-source";

// ---------------------------------------------------------------------------
// Verifica LIVE contro i dati di test ZZTEST seedati su Supabase remoto.
// Usa il motore reale (calcolaPrezzo) + la data source reale, esattamente come
// l'endpoint /api/listino/calcola-prezzo. NON gira in CI: attivare con
//   RUN_LIVE_LISTINO=1 npx jest lib/__tests__/listino-seed-live.test.ts
// ---------------------------------------------------------------------------

const RUN = process.env.RUN_LIVE_LISTINO === "1";
const d = RUN ? describe : describe.skip;

function loadEnvLocal(): Record<string, string> {
  const txt = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  const env: Record<string, string> = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

function fmt(b: {
  modalitaPrezzo: string;
  prezzoBase: number;
  coefficienti: { codice: string; moltiplicatore: number }[];
  supplementiFissi: { codice: string; importo: number }[];
  supplementiPercentuali: { codice: string; importo: number }[];
  prezzoUnitario: number;
  quantita: number;
  totale: number;
}): string {
  const coeff = b.coefficienti.map((c) => `${c.codice} x${c.moltiplicatore}`).join(", ") || "-";
  const sf = b.supplementiFissi.map((s) => `${s.codice} +${s.importo}`).join(", ") || "-";
  const sp = b.supplementiPercentuali.map((s) => `${s.codice} (${s.importo})`).join(", ") || "-";
  return [
    `modalita=${b.modalitaPrezzo}`,
    `base=${b.prezzoBase}`,
    `coeff=[${coeff}]`,
    `suppFissi=[${sf}]`,
    `suppPerc=[${sp}]`,
    `unit=${b.prezzoUnitario}`,
    `q=${b.quantita}`,
    `totale=${b.totale}`,
  ].join(" | ");
}

d("Listino LIVE (dati ZZTEST su Supabase)", () => {
  jest.setTimeout(30000);

  let supabase: SupabaseClient;
  let ds: ListinoDataSource;
  let siteId: string;
  const pid: Record<string, number> = {};
  let suppId: string;

  beforeAll(async () => {
    const env = loadEnvLocal();
    const url = env.STORAGE_SUPABASE_URL || env.STORAGE_NEXT_PUBLIC_SUPABASE_URL;
    const key = env.STORAGE_SUPABASE_SERVICE_ROLE_KEY;
    supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: sites, error: sitesErr } = await supabase
      .from("sites")
      .select("*");
    if (sitesErr) throw sitesErr;
    const santini = (sites || []).filter((s: Record<string, unknown>) =>
      Object.values(s).some(
        (v) => typeof v === "string" && v.toLowerCase().includes("santini"),
      ),
    );
    siteId = (santini[0] as { id: string }).id;
    ds = createSupabaseListinoDataSource(supabase, siteId);

    const { data: prods } = await supabase
      .from("SellProduct")
      .select("id, internal_code")
      .eq("site_id", siteId)
      .in("internal_code", ["ZZTEST-GRID", "ZZTEST-POR", "ZZTEST-ACC"]);
    for (const p of prods || []) pid[p.internal_code] = p.id;

    const { data: supp } = await supabase
      .from("supplementi")
      .select("id")
      .eq("site_id", siteId)
      .eq("codice", "ZZTEST_SUP")
      .single();
    suppId = supp!.id;

    // eslint-disable-next-line no-console
    console.log(
      `\n[LIVE] site=${siteId} | ZZTEST-GRID=${pid["ZZTEST-GRID"]} ZZTEST-POR=${pid["ZZTEST-POR"]} ZZTEST-ACC=${pid["ZZTEST-ACC"]} | supp=${suppId}\n`,
    );
  });

  it("1) GRIGLIA in-fascia (700x700) + coefficienti x1", async () => {
    const b = await calcolaPrezzo(
      {
        sellProductId: pid["ZZTEST-GRID"],
        larghezzaMm: 700,
        altezzaMm: 700,
        codMateriale: "ZZTEST_MAT",
        codVetroTelaio: "ZZTEST_VETRO",
      },
      ds,
    );
    // eslint-disable-next-line no-console
    console.log("  [1 griglia in-fascia]  " + fmt(b));
    expect(b.modalitaPrezzo).toBe("griglia");
    expect(b.prezzoBase).toBe(450);
    expect(b.coefficienti).toHaveLength(2);
    expect(b.prezzoUnitario).toBe(450);
    expect(b.totale).toBe(450);
  });

  it("1b) GRIGLIA in-fascia + supplemento fisso CHF 50", async () => {
    const b = await calcolaPrezzo(
      {
        sellProductId: pid["ZZTEST-GRID"],
        larghezzaMm: 700,
        altezzaMm: 700,
        codMateriale: "ZZTEST_MAT",
        codVetroTelaio: "ZZTEST_VETRO",
        supplementoIds: [suppId],
        quantita: 2,
      },
      ds,
    );
    // eslint-disable-next-line no-console
    console.log("  [1b griglia+supp x2]   " + fmt(b));
    expect(b.supplementiFissi).toHaveLength(1);
    expect(b.prezzoUnitario).toBe(500);
    expect(b.totale).toBe(1000);
  });

  it("1c) GRIGLIA fuori-fascia (2000x2000) -> errore chiaro, mai zero", async () => {
    let thrown: unknown = null;
    try {
      await calcolaPrezzo(
        {
          sellProductId: pid["ZZTEST-GRID"],
          larghezzaMm: 2000,
          altezzaMm: 2000,
        },
        ds,
      );
    } catch (e) {
      thrown = e;
    }
    // eslint-disable-next-line no-console
    console.log(
      "  [1c fuori-fascia]      throws=" +
        (thrown instanceof ListinoPricingError ? thrown.code : String(thrown)),
    );
    expect(thrown).toBeInstanceOf(ListinoPricingError);
    expect((thrown as ListinoPricingError).code).toBe("FASCIA_NON_TROVATA");
  });

  it("2) MISURE STANDARD (700x2000) -> prezzo esatto", async () => {
    const b = await calcolaPrezzo(
      { sellProductId: pid["ZZTEST-POR"], larghezzaMm: 700, altezzaMm: 2000 },
      ds,
    );
    // eslint-disable-next-line no-console
    console.log("  [2 misure standard]    " + fmt(b));
    expect(b.modalitaPrezzo).toBe("misure_standard");
    expect(b.prezzoBase).toBe(850);
    expect(b.prezzoUnitario).toBe(850);
  });

  it("2b) MISURE STANDARD misura inesistente -> errore chiaro", async () => {
    let thrown: unknown = null;
    try {
      await calcolaPrezzo(
        { sellProductId: pid["ZZTEST-POR"], larghezzaMm: 800, altezzaMm: 2000 },
        ds,
      );
    } catch (e) {
      thrown = e;
    }
    // eslint-disable-next-line no-console
    console.log(
      "  [2b misura inesistente] throws=" +
        (thrown instanceof ListinoPricingError ? thrown.code : String(thrown)),
    );
    expect(thrown).toBeInstanceOf(ListinoPricingError);
    expect((thrown as ListinoPricingError).code).toBe("MISURA_NON_TROVATA");
  });

  it("3) FISSO -> prezzo diretto, nessuna misura", async () => {
    const b = await calcolaPrezzo({ sellProductId: pid["ZZTEST-ACC"] }, ds);
    // eslint-disable-next-line no-console
    console.log("  [3 fisso]              " + fmt(b));
    expect(b.modalitaPrezzo).toBe("fisso");
    expect(b.prezzoBase).toBe(120);
    expect(b.prezzoUnitario).toBe(120);
  });
});
