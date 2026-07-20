/**
 * Diagnostica read-only: conta le righe visibili sulla mappa Momentum per il
 * sito indicato (default "momentum"), per ciascuna tipologia.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/check-momentum-map.ts [subdomain]
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

const ACTIVE_OFFER_STATI = [
  "richiesta",
  "in_elaborazione",
  "offerta_inviata",
  "in_trattativa",
];

async function main() {
  const { data: site, error } = await supabase
    .from("sites")
    .select("id")
    .eq("subdomain", SUBDOMAIN)
    .single();
  if (error || !site) throw new Error(`Sito "${SUBDOMAIN}" non trovato`);
  const siteId = site.id;

  const [{ data: forn }, { data: loc }, { data: eve }, { data: off }] =
    await Promise.all([
      supabase
        .from("ev_fornitori")
        .select("nome, lat, lng")
        .eq("site_id", siteId)
        .is("deleted_at", null),
      supabase
        .from("ev_location")
        .select("nome, lat, lng")
        .eq("site_id", siteId)
        .is("deleted_at", null),
      supabase
        .from("ev_eventi")
        .select("titolo, lat, lng, location:ev_location(lat, lng)")
        .eq("site_id", siteId)
        .is("deleted_at", null),
      supabase
        .from("ev_offerte")
        .select("titolo, stato, lat, lng")
        .eq("site_id", siteId)
        .is("deleted_at", null),
    ]);

  const fornTot = forn?.length ?? 0;
  const fornMap = (forn || []).filter((f) => f.lat != null && f.lng != null).length;
  const locTot = loc?.length ?? 0;
  const locMap = (loc || []).filter((l) => l.lat != null && l.lng != null).length;
  const eveTot = eve?.length ?? 0;
  const eveMap = (eve || []).filter(
    (e: any) =>
      (e.lat != null && e.lng != null) ||
      (e.location?.lat != null && e.location?.lng != null)
  ).length;
  const offActive = (off || []).filter((o) =>
    ACTIVE_OFFER_STATI.includes(o.stato)
  );
  const offMap = offActive.filter((o) => o.lat != null && o.lng != null).length;

  console.log(`\n📍 Mappa Momentum — sito "${SUBDOMAIN}" (${siteId})\n`);
  console.log(`Eventi     : ${eveMap}/${eveTot} con coordinate`);
  console.log(`Fornitori  : ${fornMap}/${fornTot} con coordinate`);
  console.log(`Location   : ${locMap}/${locTot} con coordinate`);
  console.log(
    `Offerte    : ${offMap}/${offActive.length} attive con coordinate`
  );

  const fornSenza = (forn || []).filter(
    (f) => f.lat == null || f.lng == null
  );
  if (fornSenza.length > 0) {
    console.log(
      `\n⚠️  Fornitori senza coordinate: ${fornSenza
        .map((f) => f.nome)
        .join(", ")}`
    );
  }
  const offSenza = offActive.filter((o) => o.lat == null || o.lng == null);
  if (offSenza.length > 0) {
    console.log(
      `⚠️  Offerte attive senza coordinate: ${offSenza
        .map((o) => o.titolo)
        .join(", ")}`
    );
  }
}

main().catch((e) => {
  console.error("\n❌", e);
  process.exit(1);
});
