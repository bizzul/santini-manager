// =============================================================================
// ARMADI → modello "cassone" (ARM_CASSONE)
// =============================================================================
//
//  Sposta i vecchi SellProduct "Armadi" (una riga per combinazione materiale) in
//  "Archivio 2026" (active=false) e crea 8 nuovi SellProduct "cassone" (uno per
//  tipo) con modalita_prezzo='griglia' e famiglia_apertura_cod='ARM_CASSONE'.
//
//  Crea anche la STRUTTURA (senza valori numerici reali):
//   - listino_griglia_base ARM_CASSONE: 48 fasce (L 300-1200 passo 150 x
//     H 1200-2800 passo 200), prezzo_base_chf=0, attivo=false (placeholder).
//   - listino_incrementi_dimensionali ARM_CASSONE/profondita: 1 riga,
//     prezzo_per_incremento_chf=0, attivo=false (placeholder).
//   - listino_coefficienti: 5 esecuzione_ante + 8 tipo_cassone, moltiplicatore
//     1.0, attivo=false (placeholder, i valori arrivano dopo).
//
//  SICUREZZA:
//   - Default = DRY-RUN (nessuna scrittura). Passa --apply per eseguire.
//   - --down  = ripristina (rimuove i cassone + struttura, riattiva i vecchi
//               Armadi dal report). Usare insieme a --apply.
//   - Report archiviazione: scripts/santini-catalog-2026/armadi-cassone-report.json
//
//  Usage:
//   node scripts/santini-catalog-2026/armadi-cassone.mjs            # dry-run
//   node scripts/santini-catalog-2026/armadi-cassone.mjs --apply    # esegue
//   node scripts/santini-catalog-2026/armadi-cassone.mjs --down --apply  # ripristina
// =============================================================================
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const APPLY = process.argv.includes("--apply");
const DOWN = process.argv.includes("--down");
const REPORT_PATH = path.join(__dirname, "armadi-cassone-report.json");

// I 40 Armadi attuali vivono in categoria "Arredamento", sottocategoria "Armadi"
// (8 tipi x 5 materiali). NB: "Ripiano interno armadio" e' sottocategoria
// "Librerie e mensole" e NON va toccato.
const ARMADI_CATEGORY = "Arredamento";
const ARMADI_SUBCATEGORY = "Armadi";
const ARCHIVE_CATEGORY_NAME = "Archivio 2026";
const FAMIGLIA = "ARM_CASSONE";
const PREFIX = "ARM-CASSONE-";

// 8 tipi Armadio (codice tipo_cassone 1:1 col prodotto)
const CASSONI = [
  { suffix: "MURO", codTipo: "ARM_MURO", name: "Armadio a muro su misura" },
  { suffix: "SCORR2", codTipo: "ARM_SCORR2", name: "Armadio scorrevole 2 ante" },
  { suffix: "SCORR3", codTipo: "ARM_SCORR3", name: "Armadio scorrevole 3+ ante" },
  { suffix: "ANGOLO", codTipo: "ARM_ANGOLO", name: "Armadio scorrevole ad angolo" },
  { suffix: "BATTENTE", codTipo: "ARM_BATTENTE", name: "Armadio standard a battente" },
  { suffix: "SPECCHIO", codTipo: "ARM_SPECCHIO", name: "Armadio con specchio integrato" },
  { suffix: "CABINA", codTipo: "ARM_CABINA", name: "Cabina armadio su misura" },
  { suffix: "GUARDAROBA", codTipo: "ARM_GUARDAROBA", name: "Guardaroba su misura" },
];

// Coefficienti (solo struttura, moltiplicatore neutro 1.0, attivo=false)
const ESECUZIONE_ANTE = ["TRC_B", "TRC_COL", "TRC_LEG", "IMP", "MDF_LAC"];

// Griglia ARM_CASSONE: L 300-1200 passo 150, H 1200-2800 passo 200 (placeholder)
function buildGriglia() {
  const cells = [];
  for (let l = 300; l < 1200; l += 150) {
    for (let h = 1200; h < 2800; h += 200) {
      cells.push({
        larghezza_min_mm: l,
        larghezza_max_mm: l + 150,
        altezza_min_mm: h,
        altezza_max_mm: h + 200,
        prezzo_base_chf: 0,
        attivo: false,
      });
    }
  }
  return cells;
}

// Incremento profondita (placeholder): riferimento 300mm, passo 50mm
const INCREMENTO = {
  dimensione: "profondita",
  valore_riferimento_mm: 300,
  incremento_mm: 50,
  prezzo_per_incremento_chf: 0,
  attivo: false,
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

async function categoryId(supabase, siteId, name) {
  const { data, error } = await supabase
    .from("sellproduct_categories")
    .select("id")
    .eq("site_id", siteId)
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function ensureCategory(supabase, siteId, name) {
  const existing = await categoryId(supabase, siteId, name);
  if (existing) return existing;
  if (!APPLY) return null;
  const { data, error } = await supabase
    .from("sellproduct_categories")
    .insert({ site_id: siteId, name })
    .select("id")
    .single();
  if (error) throw error;
  console.log(`  + categoria creata: ${name}`);
  return data.id;
}

async function resolveCassoneIds(supabase, siteId) {
  const { data, error } = await supabase
    .from("SellProduct")
    .select("id, internal_code")
    .eq("site_id", siteId)
    .like("internal_code", `${PREFIX}%`);
  if (error) throw error;
  const map = {};
  for (const r of data || []) map[r.internal_code] = r.id;
  return map;
}

async function up(supabase, siteId) {
  const armadiCatId = await categoryId(supabase, siteId, ARMADI_CATEGORY);
  console.log(`categoria "${ARMADI_CATEGORY}" id: ${armadiCatId ?? "(non trovata)"}`);

  // Prodotti Armadi attuali (da archiviare) = attivi in Arredamento con
  // sottocategoria "Armadi", esclusi i nuovi cassone (prefix ARM-CASSONE-).
  let daArchiviare = [];
  if (armadiCatId) {
    const { data, error } = await supabase
      .from("SellProduct")
      .select("id, name, internal_code, active, subcategory")
      .eq("site_id", siteId)
      .eq("category_id", armadiCatId)
      .eq("subcategory", ARMADI_SUBCATEGORY)
      .eq("active", true);
    if (error) throw error;
    daArchiviare = (data || []).filter(
      (p) => !(p.internal_code || "").startsWith(PREFIX),
    );
  }
  console.log(`Armadi attuali attivi da archiviare: ${daArchiviare.length}`);
  for (const p of daArchiviare) {
    console.log(`  - [${p.id}] ${p.internal_code ?? "—"} ${p.name ?? ""}`);
  }

  console.log(`\nNuovi cassone da creare: ${CASSONI.length}`);
  for (const c of CASSONI) {
    console.log(`  + ${PREFIX}${c.suffix} tipo=${c.codTipo} "${c.name}"`);
  }
  const griglia = buildGriglia();
  console.log(`\nStruttura (placeholder, attivo=false):`);
  console.log(`  griglia ${FAMIGLIA}: ${griglia.length} fasce (prezzo 0)`);
  console.log(`  incremento ${FAMIGLIA}/${INCREMENTO.dimensione}: 1 riga (prezzo 0)`);
  console.log(`  coefficienti esecuzione_ante: ${ESECUZIONE_ANTE.length}`);
  console.log(`  coefficienti tipo_cassone: ${CASSONI.length}`);

  if (!APPLY) {
    console.log("\nℹ Dry-run: nessuna scrittura. Aggiungi --apply per eseguire.");
    return;
  }

  const targetCatId = armadiCatId ?? (await ensureCategory(supabase, siteId, ARMADI_CATEGORY));
  const archiveCatId = await ensureCategory(supabase, siteId, ARCHIVE_CATEGORY_NAME);

  // 1) Crea gli 8 cassone (select -> insert/update per internal_code)
  const existing = await resolveCassoneIds(supabase, siteId);
  const cassoneIds = [];
  for (const c of CASSONI) {
    const internal = `${PREFIX}${c.suffix}`;
    const row = {
      site_id: siteId,
      internal_code: internal,
      name: c.name,
      modalita_prezzo: "griglia",
      famiglia_apertura_cod: FAMIGLIA,
      cod_tipo_cassone: c.codTipo,
      category_id: targetCatId,
      subcategory: ARMADI_SUBCATEGORY,
      type: ARMADI_SUBCATEGORY,
      active: true,
      price_list: true,
    };
    if (existing[internal]) {
      const { error } = await supabase.from("SellProduct").update(row).eq("id", existing[internal]);
      if (error) throw error;
      cassoneIds.push(existing[internal]);
    } else {
      const { data, error } = await supabase.from("SellProduct").insert(row).select("id").single();
      if (error) throw error;
      cassoneIds.push(data.id);
    }
  }
  console.log(`  cassone creati/aggiornati: ${cassoneIds.length}`);

  // 2) Archivia i vecchi Armadi (esclusi i cassone appena creati)
  const archivedIds = daArchiviare.map((p) => p.id).filter((id) => !cassoneIds.includes(id));
  if (archivedIds.length) {
    const { error } = await supabase
      .from("SellProduct")
      .update({ category_id: archiveCatId, active: false })
      .in("id", archivedIds);
    if (error) throw error;
  }
  console.log(`  archiviati: ${archivedIds.length}`);
  writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      { siteId, armadiCatId: targetCatId, archiveCatId, archivedIds, at: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log(`  report scritto: ${path.relative(repoRoot, REPORT_PATH)}`);

  // 3) Griglia placeholder (delete+insert per famiglia)
  await supabase.from("listino_griglia_base").delete().eq("site_id", siteId).eq("famiglia_apertura_cod", FAMIGLIA);
  const { error: gErr } = await supabase.from("listino_griglia_base").insert(
    griglia.map((g) => ({ site_id: siteId, famiglia_apertura_cod: FAMIGLIA, ...g })),
  );
  if (gErr) throw gErr;
  console.log(`  griglia ${FAMIGLIA}: ${griglia.length} fasce inserite`);

  // 4) Incremento dimensionale placeholder
  await supabase
    .from("listino_incrementi_dimensionali")
    .delete()
    .eq("site_id", siteId)
    .eq("famiglia_prodotto_cod", FAMIGLIA);
  const { error: iErr } = await supabase
    .from("listino_incrementi_dimensionali")
    .insert({ site_id: siteId, famiglia_prodotto_cod: FAMIGLIA, ...INCREMENTO });
  if (iErr) throw iErr;
  console.log(`  incremento ${FAMIGLIA}/${INCREMENTO.dimensione} inserito`);

  // 5) Coefficienti placeholder (esecuzione_ante + tipo_cassone), attivo=false
  const coeffRows = [
    ...ESECUZIONE_ANTE.map((codice) => ({
      site_id: siteId,
      categoria: "esecuzione_ante",
      codice,
      descrizione: "Esecuzione ante (placeholder)",
      moltiplicatore: 1.0,
      attivo: false,
    })),
    ...CASSONI.map((c) => ({
      site_id: siteId,
      categoria: "tipo_cassone",
      codice: c.codTipo,
      descrizione: `${c.name} (placeholder)`,
      moltiplicatore: 1.0,
      attivo: false,
    })),
  ];
  const { error: cErr } = await supabase
    .from("listino_coefficienti")
    .upsert(coeffRows, { onConflict: "site_id,categoria,codice" });
  if (cErr) throw cErr;
  console.log(`  coefficienti placeholder: ${coeffRows.length}`);
}

async function down(supabase, siteId) {
  const cassone = await resolveCassoneIds(supabase, siteId);
  const cassoneIds = Object.values(cassone);
  console.log(`cassone trovati: ${cassoneIds.length}`);

  if (!APPLY) {
    console.log("(dry-run) verrebbero rimossi: cassone + griglia/incrementi/coefficienti ARM_CASSONE; riattivati i vecchi Armadi dal report.");
    return;
  }

  if (cassoneIds.length) {
    await supabase.from("listino_misure_standard").delete().in("sell_product_id", cassoneIds);
    await supabase.from("listino_fisso").delete().in("sell_product_id", cassoneIds);
    await supabase.from("SellProduct").delete().in("id", cassoneIds);
  }
  await supabase.from("listino_griglia_base").delete().eq("site_id", siteId).eq("famiglia_apertura_cod", FAMIGLIA);
  await supabase.from("listino_incrementi_dimensionali").delete().eq("site_id", siteId).eq("famiglia_prodotto_cod", FAMIGLIA);
  await supabase
    .from("listino_coefficienti")
    .delete()
    .eq("site_id", siteId)
    .in("categoria", ["esecuzione_ante", "tipo_cassone"])
    .in("codice", [...ESECUZIONE_ANTE, ...CASSONI.map((c) => c.codTipo)]);

  // Ripristina i vecchi Armadi dal report (best-effort)
  if (existsSync(REPORT_PATH)) {
    const report = JSON.parse(readFileSync(REPORT_PATH, "utf8"));
    if (report.archivedIds?.length && report.armadiCatId) {
      const { error } = await supabase
        .from("SellProduct")
        .update({ category_id: report.armadiCatId, active: true })
        .in("id", report.archivedIds);
      if (error) throw error;
      console.log(`  riattivati dal report: ${report.archivedIds.length}`);
    }
  } else {
    console.log("  (nessun report trovato: i vecchi Armadi vanno riattivati manualmente)");
  }
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
  console.log("ARMADI → CASSONE (ARM_CASSONE)");
  console.log(`MODE : ${DOWN ? "DOWN (ripristino)" : "UP (migrazione)"} | ${APPLY ? "APPLY (writes)" : "DRY-RUN (no writes)"}`);
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

  if (DOWN) await down(supabase, siteId);
  else await up(supabase, siteId);

  console.log(`\n${APPLY ? "✔ Operazione completata." : "ℹ Dry-run completato."}`);
}

main().catch((e) => {
  console.error("ERRORE:", e.message || e);
  process.exit(1);
});
