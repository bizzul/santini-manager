// =============================================================================
// PORTE → consolidamento per materiale/telaio (pilota)
// =============================================================================
//
//  Le Porte oggi sono importate come una riga per combinazione materiale×telaio
//  (es. POR-0001-TAM-CTL, POR-0001-TAM-CTA, ...). Questo script consolida ogni
//  gruppo "base" (POR-NNNN) in UN solo prodotto canonico generico e archivia le
//  altre varianti. Materiale e telaio diventeranno selezionabili in offerta
//  tramite i coefficienti (categorie materiale_porta + telaio).
//
//  Cosa fa (per ogni gruppo POR-NNNN con >1 variante):
//   - CANONICO = prima variante (ordine internal_code); viene reso generico:
//       internal_code -> POR-NNNN ; cod_materiale/cod_vetro_telaio/tipo -> null.
//       (nome, sottocategoria, dimensioni, ecc. restano invariati)
//   - Le altre varianti -> categoria "Archivio 2026", active=false.
//   - I gruppi con 1 sola variante (POR-0122, ...) restano INTATTI.
//
//  Crea anche la STRUTTURA coefficienti (placeholder, attivo=false, x1.0):
//   - materiale_porta: un codice per ciascun materiale trovato (TAM, MAS, ...)
//   - telaio:          un codice per ciascun telaio trovato (CTL, CTA, APL)
//  Nessun valore numerico reale: i moltiplicatori arriveranno dopo.
//
//  SICUREZZA:
//   - Default = DRY-RUN (nessuna scrittura). Passa --apply per eseguire.
//   - --down --apply = ripristina (canonici + varianti archiviate dal report,
//     rimuove i coefficienti placeholder creati).
//   - Report: scripts/santini-catalog-2026/consolida-porte-report.json
//
//  Usage:
//   node scripts/santini-catalog-2026/consolida-porte.mjs            # dry-run
//   node scripts/santini-catalog-2026/consolida-porte.mjs --apply    # esegue
//   node scripts/santini-catalog-2026/consolida-porte.mjs --down --apply  # ripristina
// =============================================================================
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const APPLY = process.argv.includes("--apply");
const DOWN = process.argv.includes("--down");
const REPORT_PATH = path.join(__dirname, "consolida-porte-report.json");

const CATEGORY_NAME = "Porte";
const ARCHIVE_CATEGORY_NAME = "Archivio 2026";

// base = PREFISSO-NNNN (es. POR-0001). Le varianti hanno suffissi -MAT[-TELAIO].
const baseCode = (ic) => {
  const m = (ic || "").match(/^([A-Za-z]+-\d+)/);
  return m ? m[1] : null;
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

// Suddivide una variante in { mat, telaio } a partire dal suffisso del codice.
function splitSuffix(internalCode, base) {
  const rest = internalCode.slice(base.length + 1); // es. "TAM-CTL"
  if (!rest) return { mat: null, telaio: null };
  const parts = rest.split("-");
  return { mat: parts[0] || null, telaio: parts.slice(1).join("-") || null };
}

async function up(supabase, siteId) {
  const porteCatId = await categoryId(supabase, siteId, CATEGORY_NAME);
  if (!porteCatId) throw new Error(`Categoria "${CATEGORY_NAME}" non trovata`);
  console.log(`categoria "${CATEGORY_NAME}" id: ${porteCatId}`);

  const { data: prods, error } = await supabase
    .from("SellProduct")
    .select("id, internal_code, name, tipo, cod_materiale, cod_vetro_telaio, subcategory")
    .eq("site_id", siteId)
    .eq("category_id", porteCatId)
    .eq("active", true)
    .order("internal_code");
  if (error) throw error;

  // Raggruppa per base; scarta prodotti senza base (es. ZZTEST).
  const groups = {};
  for (const p of prods || []) {
    const b = baseCode(p.internal_code);
    if (!b) continue;
    (groups[b] = groups[b] || []).push(p);
  }

  // Mappe etichette materiale/telaio dedotte dal campo tipo ("mat / telaio").
  const matLabels = {};
  const telLabels = {};
  for (const [b, variants] of Object.entries(groups)) {
    for (const p of variants) {
      const { mat, telaio } = splitSuffix(p.internal_code, b);
      const tlabels = (p.tipo || "").split(" / ");
      if (mat && !matLabels[mat]) matLabels[mat] = (tlabels[0] || mat).trim();
      if (telaio && !telLabels[telaio]) telLabels[telaio] = (tlabels[1] || telaio).trim();
    }
  }

  const canonicalPlan = []; // { id, prevInternalCode, newInternalCode, prevTipo, prevMat, prevVt }
  const archivePlan = []; // { id, prevInternalCode }
  let multiGroups = 0;
  let singleGroups = 0;

  for (const [b, variantsRaw] of Object.entries(groups)) {
    const variants = [...variantsRaw].sort((a, x) =>
      (a.internal_code || "").localeCompare(x.internal_code || ""),
    );
    if (variants.length === 1) {
      singleGroups++;
      continue; // già generico/singolo: intatto
    }
    multiGroups++;
    const canonical = variants[0];
    canonicalPlan.push({
      id: canonical.id,
      prevInternalCode: canonical.internal_code,
      newInternalCode: b,
      prevTipo: canonical.tipo ?? null,
      prevMat: canonical.cod_materiale ?? null,
      prevVt: canonical.cod_vetro_telaio ?? null,
    });
    for (const other of variants.slice(1)) {
      archivePlan.push({ id: other.id, prevInternalCode: other.internal_code });
    }
  }

  console.log(`\nGruppi trovati: ${Object.keys(groups).length} (multi: ${multiGroups}, singoli intatti: ${singleGroups})`);
  console.log(`Canonici da rendere generici: ${canonicalPlan.length}`);
  console.log(`Varianti da archiviare: ${archivePlan.length}`);
  console.log(`\nCoefficienti placeholder (attivo=false, x1.0):`);
  console.log(`  materiale_porta: ${Object.keys(matLabels).length} -> ${Object.entries(matLabels).map(([c, l]) => `${c}=${l}`).join("; ")}`);
  console.log(`  telaio:          ${Object.keys(telLabels).length} -> ${Object.entries(telLabels).map(([c, l]) => `${c}=${l}`).join("; ")}`);
  console.log(`\nEsempi canonici:`);
  for (const c of canonicalPlan.slice(0, 5)) console.log(`  ${c.prevInternalCode} -> ${c.newInternalCode}`);

  if (!APPLY) {
    console.log("\nℹ Dry-run: nessuna scrittura. Aggiungi --apply per eseguire.");
    return;
  }

  const archiveCatId = await ensureCategory(supabase, siteId, ARCHIVE_CATEGORY_NAME);

  // 1) Archivia le varianti non-canoniche (prima, per liberare eventuali vincoli
  //    prima di rinominare i canonici).
  const archivedIds = archivePlan.map((a) => a.id);
  if (archivedIds.length) {
    const { error: aErr } = await supabase
      .from("SellProduct")
      .update({ category_id: archiveCatId, active: false })
      .in("id", archivedIds);
    if (aErr) throw aErr;
  }
  console.log(`  archiviate: ${archivedIds.length}`);

  // 2) Rendi generici i canonici (rename + pulizia campi materiale/telaio)
  for (const c of canonicalPlan) {
    const { error: uErr } = await supabase
      .from("SellProduct")
      .update({
        internal_code: c.newInternalCode,
        cod_materiale: null,
        cod_vetro_telaio: null,
        tipo: null,
      })
      .eq("id", c.id);
    if (uErr) throw uErr;
  }
  console.log(`  canonici resi generici: ${canonicalPlan.length}`);

  // 3) Coefficienti placeholder materiale_porta + telaio
  const coeffRows = [
    ...Object.entries(matLabels).map(([codice, label]) => ({
      site_id: siteId,
      categoria: "materiale_porta",
      codice,
      descrizione: label,
      moltiplicatore: 1.0,
      attivo: false,
    })),
    ...Object.entries(telLabels).map(([codice, label]) => ({
      site_id: siteId,
      categoria: "telaio",
      codice,
      descrizione: label,
      moltiplicatore: 1.0,
      attivo: false,
    })),
  ];
  const { error: cErr } = await supabase
    .from("listino_coefficienti")
    .upsert(coeffRows, { onConflict: "site_id,categoria,codice" });
  if (cErr) throw cErr;
  console.log(`  coefficienti placeholder: ${coeffRows.length}`);

  writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        siteId,
        porteCatId,
        archiveCatId,
        canonical: canonicalPlan,
        archived: archivePlan,
        coeff: {
          materiale_porta: Object.keys(matLabels),
          telaio: Object.keys(telLabels),
        },
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(`  report scritto: ${path.relative(repoRoot, REPORT_PATH)}`);
}

async function down(supabase, siteId) {
  if (!existsSync(REPORT_PATH)) {
    throw new Error("Nessun report trovato: impossibile ripristinare automaticamente.");
  }
  const report = JSON.parse(readFileSync(REPORT_PATH, "utf8"));
  console.log(`report: canonici ${report.canonical?.length ?? 0}, archiviate ${report.archived?.length ?? 0}`);

  if (!APPLY) {
    console.log("(dry-run) verrebbero ripristinati canonici e varianti archiviate + rimossi i coefficienti placeholder.");
    return;
  }

  // 1) Ripristina i canonici (codice + campi materiale/telaio originali)
  for (const c of report.canonical || []) {
    const { error } = await supabase
      .from("SellProduct")
      .update({
        internal_code: c.prevInternalCode,
        cod_materiale: c.prevMat,
        cod_vetro_telaio: c.prevVt,
        tipo: c.prevTipo,
      })
      .eq("id", c.id);
    if (error) throw error;
  }
  console.log(`  canonici ripristinati: ${report.canonical?.length ?? 0}`);

  // 2) Riattiva le varianti archiviate
  const archivedIds = (report.archived || []).map((a) => a.id);
  if (archivedIds.length && report.porteCatId) {
    const { error } = await supabase
      .from("SellProduct")
      .update({ category_id: report.porteCatId, active: true })
      .in("id", archivedIds);
    if (error) throw error;
  }
  console.log(`  varianti riattivate: ${archivedIds.length}`);

  // 3) Rimuovi i coefficienti placeholder creati
  const matCodes = report.coeff?.materiale_porta || [];
  const telCodes = report.coeff?.telaio || [];
  if (matCodes.length) {
    await supabase
      .from("listino_coefficienti")
      .delete()
      .eq("site_id", siteId)
      .eq("categoria", "materiale_porta")
      .in("codice", matCodes);
  }
  if (telCodes.length) {
    await supabase
      .from("listino_coefficienti")
      .delete()
      .eq("site_id", siteId)
      .eq("categoria", "telaio")
      .in("codice", telCodes);
  }
  console.log(`  coefficienti placeholder rimossi: ${matCodes.length + telCodes.length}`);
  console.log("  ripristino completato.");
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
  console.log("PORTE → consolidamento materiale/telaio");
  console.log(`MODE : ${DOWN ? "DOWN (ripristino)" : "UP (consolidamento)"} | ${APPLY ? "APPLY (writes)" : "DRY-RUN (no writes)"}`);
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
