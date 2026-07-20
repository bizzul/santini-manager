/**
 * Rende visibili sulla mappa Momentum i fornitori e le offerte demo:
 * - riattiva (deleted_at = null) e assegna indirizzo/coordinate ai fornitori
 *   demo (match per nome), inserendoli se assenti;
 * - assegna coordinate alle offerte attive demo (match per titolo).
 *
 * Idempotente. Non tocca eventi/location (già geolocalizzati).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/fix-momentum-map-demo.ts [subdomain]
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
  process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = process.argv[2] || "momentum";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing Supabase env vars. Run with --env-file=.env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

interface FornDef {
  nome: string;
  categoria: string;
  costo_indicativo: number;
  citta: string;
  lat: number;
  lng: number;
}

const FORNITORI: FornDef[] = [
  { nome: "DJ Luma", categoria: "artisti", costo_indicativo: 1800, citta: "Lugano", lat: 46.003, lng: 8.951 },
  { nome: "DJ Nero", categoria: "artisti", costo_indicativo: 2400, citta: "Bellinzona", lat: 46.195, lng: 9.023 },
  { nome: "Sax Live Andrea", categoria: "artisti", costo_indicativo: 900, citta: "Locarno", lat: 46.171, lng: 8.795 },
  { nome: "AudioLuci Service SA", categoria: "materials", costo_indicativo: 3200, citta: "Giubiasco", lat: 46.172, lng: 9.006 },
  { nome: "Catering Sapori Ticino", categoria: "food", costo_indicativo: 2600, citta: "Mendrisio", lat: 45.87, lng: 8.981 },
  { nome: "Mobile Bar Spritz&Co", categoria: "beverage", costo_indicativo: 1500, citta: "Chiasso", lat: 45.833, lng: 9.031 },
  { nome: "SecurEvent Sagl", categoria: "staff_security", costo_indicativo: 1200, citta: "Bellinzona", lat: 46.19, lng: 9.017 },
  { nome: "Social Studio TI", categoria: "marketing", costo_indicativo: 700, citta: "Lugano", lat: 46.006, lng: 8.96 },
  { nome: "Location Partner Lugano", categoria: "location", costo_indicativo: 2000, citta: "Paradiso", lat: 45.997, lng: 8.947 },
];

const OFFERTE_COORDS: Array<{ titolo: string; lat: number; lng: number }> = [
  { titolo: "Aperitivo aziendale fine anno", lat: 46.196, lng: 9.026 },
  { titolo: "Festa 18esimo compleanno", lat: 46.008, lng: 8.955 },
  { titolo: "Serata inaugurazione flagship store", lat: 45.871, lng: 8.984 },
];

async function main() {
  const { data: site, error } = await supabase
    .from("sites")
    .select("id")
    .eq("subdomain", SUBDOMAIN)
    .single();
  if (error || !site) throw new Error(`Sito "${SUBDOMAIN}" non trovato`);
  const siteId = site.id;

  let fornUpdated = 0;
  let fornInserted = 0;
  let fornRevived = 0;

  for (const f of FORNITORI) {
    // Match per nome anche tra i record soft-deleted.
    const { data: existing } = await supabase
      .from("ev_fornitori")
      .select("id, deleted_at")
      .eq("site_id", siteId)
      .eq("nome", f.nome)
      .maybeSingle();

    if (existing) {
      if (existing.deleted_at) fornRevived++;
      const { error: upErr } = await supabase
        .from("ev_fornitori")
        .update({
          categoria: f.categoria,
          costo_indicativo: f.costo_indicativo,
          citta: f.citta,
          lat: f.lat,
          lng: f.lng,
          deleted_at: null,
        })
        .eq("id", existing.id);
      if (upErr) throw new Error(`update fornitore ${f.nome}: ${upErr.message}`);
      fornUpdated++;
    } else {
      const { error: insErr } = await supabase.from("ev_fornitori").insert({
        site_id: siteId,
        nome: f.nome,
        categoria: f.categoria,
        costo_indicativo: f.costo_indicativo,
        citta: f.citta,
        lat: f.lat,
        lng: f.lng,
      });
      if (insErr) throw new Error(`insert fornitore ${f.nome}: ${insErr.message}`);
      fornInserted++;
    }
  }

  console.log(
    `✓ Fornitori: ${fornInserted} inseriti, ${fornUpdated} aggiornati (${fornRevived} riattivati)`
  );

  let offUpdated = 0;
  for (const o of OFFERTE_COORDS) {
    const { data: existing } = await supabase
      .from("ev_offerte")
      .select("id")
      .eq("site_id", siteId)
      .eq("titolo", o.titolo)
      .is("deleted_at", null)
      .maybeSingle();
    if (!existing) continue;
    const { error: upErr } = await supabase
      .from("ev_offerte")
      .update({ lat: o.lat, lng: o.lng })
      .eq("id", existing.id);
    if (upErr) throw new Error(`update offerta ${o.titolo}: ${upErr.message}`);
    offUpdated++;
  }
  console.log(`✓ Offerte: ${offUpdated} coordinate aggiornate`);
  console.log("\n✅ Fix mappa Momentum completato.");
}

main().catch((e) => {
  console.error("\n❌", e);
  process.exit(1);
});
