// =============================================================================
// SEED DATI DI TEST — Listino prezzi + Supplementi (Fase 6, verifica E2E)
// =============================================================================
//
//  ⚠️  DATI DI TEST — NON DEFINITIVI. Tutto è marcato con il prefisso "ZZTEST"
//      così da essere facilmente identificabile e rimovibile.
//      Rimozione completa:  node scripts/santini-catalog-2026/seed-listino-test.mjs --down --apply
//
//  Canale: Supabase service role via REST (bypassa RLS; site_id impostato
//          esplicitamente). Stesse env di import.mjs (.env.local).
//
//  SICUREZZA:
//   - Default = DRY-RUN (nessuna scrittura). Passa --apply per eseguire.
//   - --down  = rimuove i dati di test (usare insieme a --apply per scrivere).
//   - Idempotente: ri-eseguibile con --apply senza creare duplicati.
//
//  Cosa crea (site "Santini"):
//   - 3 prodotti SellProduct di test (internal_code ZZTEST-*) con modalita_prezzo:
//       ZZTEST-GRID (griglia, FIN_SING, cat. Serramenti)
//       ZZTEST-POR  (misure_standard, cat. Porte)
//       ZZTEST-ACC  (fisso, cat. Accessori)
//   - listino_griglia_base: 3 celle FIN_SING (400-600, 600-800, 800-1000 mm)
//   - listino_coefficienti: 1 materiale + 1 vetro, moltiplicatore 1.00
//   - listino_misure_standard: ZZTEST-POR 700x2000 mm
//   - listino_fisso: ZZTEST-ACC
//   - supplementi: 1 supplemento fisso CHF 50 collegato a "Serramenti" (+ "tutte")
//
//  Usage:
//   node scripts/santini-catalog-2026/seed-listino-test.mjs            # dry-run seed
//   node scripts/santini-catalog-2026/seed-listino-test.mjs --apply    # scrive il seed
//   node scripts/santini-catalog-2026/seed-listino-test.mjs --down --apply  # rimuove il seed
// =============================================================================
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const APPLY = process.argv.includes("--apply");
const DOWN = process.argv.includes("--down");

const MARK = "ZZTEST";

const PRODUCTS = [
  {
    internal_code: "ZZTEST-GRID",
    name: "ZZTEST · Finestra griglia FIN_SING",
    modalita_prezzo: "griglia",
    famiglia_apertura_cod: "FIN_SING",
    category: "Serramenti",
  },
  {
    internal_code: "ZZTEST-POR",
    name: "ZZTEST · Porta standard 700x2000",
    modalita_prezzo: "misure_standard",
    famiglia_apertura_cod: null,
    category: "Porte",
  },
  {
    internal_code: "ZZTEST-ACC",
    name: "ZZTEST · Accessorio prezzo fisso",
    modalita_prezzo: "fisso",
    famiglia_apertura_cod: null,
    category: "Accessori",
  },
];

const COEFFICIENTI = [
  {
    categoria: "materiale_serramento",
    codice: "ZZTEST_MAT",
    descrizione: "ZZTEST Materiale (x1.00)",
    moltiplicatore: 1.0,
  },
  {
    categoria: "vetro",
    codice: "ZZTEST_VETRO",
    descrizione: "ZZTEST Vetro (x1.00)",
    moltiplicatore: 1.0,
  },
];
const COEFF_CODES = COEFFICIENTI.map((c) => c.codice);

const FAMIGLIA = "FIN_SING";
const GRIGLIA = [
  { larghezza_min_mm: 400, larghezza_max_mm: 600, altezza_min_mm: 400, altezza_max_mm: 600, prezzo_base_chf: 300.0 },
  { larghezza_min_mm: 600, larghezza_max_mm: 800, altezza_min_mm: 600, altezza_max_mm: 800, prezzo_base_chf: 450.0 },
  { larghezza_min_mm: 800, larghezza_max_mm: 1000, altezza_min_mm: 800, altezza_max_mm: 1000, prezzo_base_chf: 600.0 },
];
const GRIGLIA_MINS = GRIGLIA.map((g) => g.larghezza_min_mm);

const MISURA = { larghezza_mm: 700, altezza_mm: 2000, prezzo_chf: 850.0 };
const FISSO_PREZZO = 120.0;

const SUPPLEMENTO = {
  codice: "ZZTEST_SUP",
  nome: "ZZTEST Supplemento fisso",
  descrizione: "Supplemento di test (fisso CHF 50)",
  tipo_calcolo: "fisso_chf",
  valore: 50,
  categorie: ["Serramenti", "tutte"],
};

function loadEnv() {
  const txt = readFileSync(path.join(repoRoot, ".env.local"), "utf8");
  const env = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

function normalize(v) {
  return (v || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function ensureCategory(supabase, siteId, name) {
  const { data: existing, error } = await supabase
    .from("sellproduct_categories")
    .select("id")
    .eq("site_id", siteId)
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing.id;
  if (!APPLY) return null; // dry-run: non creare
  const { data: created, error: insErr } = await supabase
    .from("sellproduct_categories")
    .insert({ site_id: siteId, name })
    .select("id")
    .single();
  if (insErr) throw insErr;
  console.log(`  + categoria creata: ${name}`);
  return created.id;
}

async function resolveProductIds(supabase, siteId) {
  const { data, error } = await supabase
    .from("SellProduct")
    .select("id, internal_code")
    .eq("site_id", siteId)
    .in("internal_code", PRODUCTS.map((p) => p.internal_code));
  if (error) throw error;
  const map = {};
  for (const row of data || []) map[row.internal_code] = row.id;
  return map;
}

async function seed(supabase, siteId) {
  // 1) Prodotti di test (select -> insert/update; l'indice su internal_code
  //    e' PARZIALE, quindi ON CONFLICT non e' utilizzabile)
  const existingIds = APPLY ? await resolveProductIds(supabase, siteId) : {};
  for (const p of PRODUCTS) {
    const categoryId = await ensureCategory(supabase, siteId, p.category);
    console.log(
      `  prodotto ${p.internal_code} [${p.modalita_prezzo}] cat=${p.category}`,
    );
    if (!APPLY) continue;
    const row = {
      site_id: siteId,
      internal_code: p.internal_code,
      name: p.name,
      modalita_prezzo: p.modalita_prezzo,
      famiglia_apertura_cod: p.famiglia_apertura_cod,
      category_id: categoryId,
      active: true,
      price_list: true,
    };
    if (existingIds[p.internal_code]) {
      const { error } = await supabase
        .from("SellProduct")
        .update(row)
        .eq("id", existingIds[p.internal_code]);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("SellProduct").insert(row);
      if (error) throw error;
    }
  }

  const ids = APPLY ? await resolveProductIds(supabase, siteId) : {};

  // 2) Coefficienti (upsert su site_id,categoria,codice)
  for (const c of COEFFICIENTI) {
    console.log(`  coefficiente ${c.categoria}/${c.codice} x${c.moltiplicatore}`);
    if (!APPLY) continue;
    const { error } = await supabase.from("listino_coefficienti").upsert(
      { site_id: siteId, attivo: true, ...c },
      { onConflict: "site_id,categoria,codice" },
    );
    if (error) throw error;
  }

  // 3) Griglia FIN_SING (delete+insert delle celle di test)
  console.log(`  griglia ${FAMIGLIA}: ${GRIGLIA.length} celle`);
  if (APPLY) {
    const { error: delErr } = await supabase
      .from("listino_griglia_base")
      .delete()
      .eq("site_id", siteId)
      .eq("famiglia_apertura_cod", FAMIGLIA)
      .in("larghezza_min_mm", GRIGLIA_MINS);
    if (delErr) throw delErr;
    const { error: insErr } = await supabase.from("listino_griglia_base").insert(
      GRIGLIA.map((g) => ({
        site_id: siteId,
        famiglia_apertura_cod: FAMIGLIA,
        attivo: true,
        ...g,
      })),
    );
    if (insErr) throw insErr;
  }

  // 4) Misure standard (ZZTEST-POR)
  console.log(`  misure standard ZZTEST-POR ${MISURA.larghezza_mm}x${MISURA.altezza_mm} = ${MISURA.prezzo_chf}`);
  if (APPLY) {
    const pid = ids["ZZTEST-POR"];
    if (!pid) throw new Error("ZZTEST-POR non risolto");
    const { error } = await supabase.from("listino_misure_standard").upsert(
      { site_id: siteId, sell_product_id: pid, attivo: true, ...MISURA },
      { onConflict: "site_id,sell_product_id,larghezza_mm,altezza_mm" },
    );
    if (error) throw error;
  }

  // 5) Fisso (ZZTEST-ACC)
  console.log(`  fisso ZZTEST-ACC = ${FISSO_PREZZO}`);
  if (APPLY) {
    const pid = ids["ZZTEST-ACC"];
    if (!pid) throw new Error("ZZTEST-ACC non risolto");
    const { error } = await supabase.from("listino_fisso").upsert(
      { site_id: siteId, sell_product_id: pid, attivo: true, prezzo_chf: FISSO_PREZZO },
      { onConflict: "site_id,sell_product_id" },
    );
    if (error) throw error;
  }

  // 6) Supplemento + categorie
  console.log(`  supplemento ${SUPPLEMENTO.codice} (${SUPPLEMENTO.tipo_calcolo} ${SUPPLEMENTO.valore}) -> ${SUPPLEMENTO.categorie.join(", ")}`);
  if (APPLY) {
    const { categorie, ...suppRow } = SUPPLEMENTO;
    const { data: supp, error } = await supabase
      .from("supplementi")
      .upsert(
        { site_id: siteId, attivo: true, ...suppRow },
        { onConflict: "site_id,codice" },
      )
      .select("id")
      .single();
    if (error) throw error;
    const { error: linkErr } = await supabase
      .from("supplementi_categorie")
      .upsert(
        categorie.map((categoria) => ({ supplemento_id: supp.id, categoria })),
        { onConflict: "supplemento_id,categoria", ignoreDuplicates: true },
      );
    if (linkErr) throw linkErr;
  }
}

async function teardown(supabase, siteId) {
  const ids = await resolveProductIds(supabase, siteId);
  const pidList = Object.values(ids);
  console.log(`  prodotti di test trovati: ${pidList.length}`);

  if (!APPLY) {
    console.log("  (dry-run) verrebbero rimossi: listino_* + supplementi + SellProduct ZZTEST-*");
    return;
  }

  if (pidList.length) {
    await supabase.from("listino_misure_standard").delete().in("sell_product_id", pidList);
    await supabase.from("listino_fisso").delete().in("sell_product_id", pidList);
  }
  await supabase
    .from("listino_griglia_base")
    .delete()
    .eq("site_id", siteId)
    .eq("famiglia_apertura_cod", FAMIGLIA)
    .in("larghezza_min_mm", GRIGLIA_MINS);
  await supabase
    .from("listino_coefficienti")
    .delete()
    .eq("site_id", siteId)
    .in("codice", COEFF_CODES);
  // supplementi_categorie rimosse in cascata dalla FK on delete cascade
  await supabase.from("supplementi").delete().eq("site_id", siteId).eq("codice", SUPPLEMENTO.codice);
  await supabase
    .from("SellProduct")
    .delete()
    .eq("site_id", siteId)
    .like("internal_code", `${MARK}-%`);
  console.log("  rimozione completata.");
}

async function main() {
  const env = loadEnv();
  const SUPABASE_URL = env.STORAGE_SUPABASE_URL || env.STORAGE_NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = env.STORAGE_SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Missing Supabase REST env vars in .env.local");
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const host = (() => {
    try {
      return new URL(SUPABASE_URL).host;
    } catch {
      return SUPABASE_URL;
    }
  })();
  console.log("=".repeat(70));
  console.log(`SEED LISTINO/SUPPLEMENTI — DATI DI TEST (${MARK})`);
  console.log(`MODE : ${DOWN ? "TEARDOWN" : "SEED"} | ${APPLY ? "APPLY (writes)" : "DRY-RUN (no writes)"}`);
  console.log(`TARGET: ${host}`);
  console.log("=".repeat(70));

  const { data: sites, error: sErr } = await supabase.from("sites").select("*");
  if (sErr) throw sErr;
  const santini = (sites || []).filter((s) =>
    Object.values(s).some((v) => typeof v === "string" && normalize(v).includes("santini")),
  );
  if (santini.length !== 1) throw new Error(`Expected 1 Santini site, found ${santini.length}`);
  const siteId = santini[0].id;
  console.log(`site : ${santini[0].name} | id: ${siteId}\n`);

  if (DOWN) await teardown(supabase, siteId);
  else await seed(supabase, siteId);

  console.log(`\n${APPLY ? "✔ Operazione completata." : "ℹ Dry-run: nessuna scrittura. Aggiungi --apply per eseguire."}`);
}

main().catch((e) => {
  console.error("ERRORE:", e.message || e);
  process.exit(1);
});
