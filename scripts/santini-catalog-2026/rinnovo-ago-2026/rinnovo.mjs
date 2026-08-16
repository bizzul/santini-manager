// Rinnovo catalogo Santini ago 2026 (Arredamento / Porte / Serramenti).
// Sostituisce il catalogo attivo con i 41 prodotti di catalogo.mjs, rimappa
// TUTTI i progetti (Task.sellProductId + offer_products[].productId, incluse
// le righe che puntano al vecchio "Archivio 2026") e archivia i vecchi
// prodotti in "Archivio ago 2026" (active=false). Niente delete di prodotti.
//
// SAFETY (convenzioni di import.mjs):
//  - Default DRY-RUN: nessuna scrittura; stampa piano + mappature e scrive
//    rinnovo-report.json (sezione plan) per revisione.
//  - --apply: (1) insert nuovi prodotti, (2) upsert coefficienti, (3) remap
//    Task.sellProductId, (4) remap offer_products, (5) archivia vecchi.
//    Se l'insert fallisce: delete dei soli inseriti in questo run e stop.
//    Il report viene flushato su disco dopo ogni fase.
//  - --down --apply: ripristino completo dal report (task, prodotti
//    archiviati, delete inseriti, coefficienti).
//
// Usage:
//   node scripts/santini-catalog-2026/rinnovo-ago-2026/rinnovo.mjs            # dry-run
//   node scripts/santini-catalog-2026/rinnovo-ago-2026/rinnovo.mjs --apply
//   node scripts/santini-catalog-2026/rinnovo-ago-2026/rinnovo.mjs --down --apply
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  SITE_ID,
  TARGET_CATEGORIES,
  OLD_ARCHIVE_CATEGORY_NAME,
  ARCHIVE_CATEGORY_NAME,
  NEW_PRODUCTS,
  NEW_COEFFICIENTI,
  OBSOLETE_TELAIO_CODES,
} from "./catalogo.mjs";
import { mapOldProduct } from "./mappings.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const REPORT_PATH = path.join(__dirname, "rinnovo-report.json");
const APPLY = process.argv.includes("--apply");
const DOWN = process.argv.includes("--down");
const INSERT_BATCH = 200;

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
  return (v || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

async function pageAll(query, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function makeSupabase() {
  const env = loadEnv();
  const url = env.STORAGE_SUPABASE_URL || env.STORAGE_NEXT_PUBLIC_SUPABASE_URL;
  const key = env.STORAGE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase REST env vars");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resolveSite(supabase) {
  const { data: sites, error } = await supabase.from("sites").select("*");
  if (error) throw error;
  const santini = (sites || []).filter((s) =>
    Object.values(s).some((v) => typeof v === "string" && normalize(v).includes("santini")),
  );
  if (santini.length !== 1) throw new Error(`Expected 1 Santini site, found ${santini.length}`);
  if (santini[0].id !== SITE_ID) {
    throw new Error(`Site id mismatch: expected ${SITE_ID}, got ${santini[0].id}`);
  }
  console.log("site:", santini[0].name, "| id:", santini[0].id);
  return santini[0].id;
}

function flushReport(report) {
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
}

// ------------------------------------------------------------------ DOWN
async function down(supabase, siteId) {
  if (!existsSync(REPORT_PATH)) throw new Error("rinnovo-report.json non trovato: nulla da ripristinare.");
  const report = JSON.parse(readFileSync(REPORT_PATH, "utf8"));
  if (!report.applied) throw new Error("Il report non risulta da un run --apply: nulla da ripristinare.");

  console.log(`DOWN plan: ${report.taskRemaps.length} task, ${report.archived.length} prodotti da ripristinare, ${report.insertedIds.length} inseriti da eliminare.`);
  if (!APPLY) {
    console.log("DRY-RUN: nessuna scrittura. Aggiungi --apply per ripristinare.");
    return;
  }

  // 1) Ripristina i task (sellProductId + offer_products)
  for (const t of report.taskRemaps) {
    const patch = {};
    if (t.prevSellProductId !== undefined) patch.sellProductId = t.prevSellProductId;
    if (t.prevOfferProducts !== undefined) patch.offer_products = t.prevOfferProducts;
    const { error } = await supabase.from("Task").update(patch).eq("id", t.taskId).eq("site_id", siteId);
    if (error) throw error;
  }
  console.log(`ripristinati ${report.taskRemaps.length} task`);

  // 2) Ripristina categoria/active dei prodotti archiviati
  for (const a of report.archived) {
    const { error } = await supabase
      .from("SellProduct")
      .update({ category_id: a.prevCategoryId, active: a.prevActive })
      .eq("id", a.id)
      .eq("site_id", siteId);
    if (error) throw error;
  }
  console.log(`ripristinati ${report.archived.length} prodotti archiviati`);

  // 3) Elimina i prodotti inseriti dal run (i task sono già stati ripristinati)
  for (let i = 0; i < report.insertedIds.length; i += 200) {
    const chunk = report.insertedIds.slice(i, i + 200);
    const { error } = await supabase.from("SellProduct").delete().in("id", chunk).eq("site_id", siteId);
    if (error) throw error;
  }
  console.log(`eliminati ${report.insertedIds.length} prodotti inseriti dal run`);

  // 4) Coefficienti: elimina i creati dal run, ripristina i telaio eliminati
  for (const c of report.coeff.created) {
    const { error } = await supabase
      .from("listino_coefficienti")
      .delete()
      .eq("site_id", siteId)
      .eq("categoria", c.categoria)
      .eq("codice", c.codice);
    if (error) throw error;
  }
  if (report.coeff.deletedTelaio.length > 0) {
    const rows = report.coeff.deletedTelaio.map(({ id, created_at, updated_at, ...rest }) => rest);
    const { error } = await supabase.from("listino_coefficienti").insert(rows);
    if (error) throw error;
  }
  console.log(`coefficienti: eliminati ${report.coeff.created.length} creati, ripristinati ${report.coeff.deletedTelaio.length} telaio`);
  console.log("DOWN completato.");
}

// ------------------------------------------------------------------ UP
async function up(supabase, siteId) {
  // --- Preflight (read-only) ---
  const { data: cats, error: cErr } = await supabase
    .from("sellproduct_categories")
    .select("id, name")
    .eq("site_id", siteId);
  if (cErr) throw cErr;
  const catByNorm = new Map((cats || []).map((c) => [normalize(c.name), c]));

  const targetCatIds = {};
  for (const name of TARGET_CATEGORIES) {
    const c = catByNorm.get(normalize(name));
    if (!c) throw new Error(`Categoria "${name}" non trovata per il sito.`);
    targetCatIds[name] = c.id;
  }
  const oldArchiveCat = catByNorm.get(normalize(OLD_ARCHIVE_CATEGORY_NAME)) ?? null;
  console.log("target category ids:", targetCatIds, "| Archivio 2026:", oldArchiveCat?.id ?? "n/a");

  // Prodotti esistenti del sito
  const allProducts = await pageAll((from, to) =>
    supabase
      .from("SellProduct")
      .select("id, internal_code, name, subcategory, type, category_id, active, cod_tipo_cassone")
      .eq("site_id", siteId)
      .range(from, to),
  );

  // Collisioni codici nuovi
  const existingCodes = new Set(allProducts.map((p) => p.internal_code).filter(Boolean));
  const collisions = NEW_PRODUCTS.filter((p) => existingCodes.has(p.internal_code));
  if (collisions.length > 0) {
    throw new Error(`Collisioni internal_code: ${collisions.map((c) => c.internal_code).join(", ")}`);
  }

  const targetIdSet = new Set(Object.values(targetCatIds));
  const oldActive = allProducts.filter((p) => targetIdSet.has(p.category_id));
  const oldArchived = oldArchiveCat
    ? allProducts.filter((p) => p.category_id === oldArchiveCat.id)
    : [];
  console.log(`oldActive (nelle 3 categorie): ${oldActive.length} | oldArchived (Archivio 2026): ${oldArchived.length}`);

  // --- Mappatura vecchio -> nuovo codice ---
  const isTest = (p) => (p.internal_code || "").toUpperCase().startsWith("ZZTEST");
  const mappable = [...oldActive, ...oldArchived].filter((p) => !isTest(p));
  const mapping = new Map(); // oldId -> { target, confidence, domain, old }
  for (const p of mappable) {
    mapping.set(p.id, { ...mapOldProduct(p), old: p });
  }

  // --- Scan task e piano di remap ---
  const tasks = await pageAll((from, to) =>
    supabase
      .from("Task")
      .select("id, sellProductId, offer_products")
      .eq("site_id", siteId)
      .range(from, to),
  );

  const taskPlans = [];
  const zztestRefs = [];
  const testIds = new Set([...oldActive, ...oldArchived].filter(isTest).map((p) => p.id));
  for (const t of tasks) {
    const plan = { taskId: t.id };
    if (t.sellProductId != null && mapping.has(t.sellProductId)) {
      plan.prevSellProductId = t.sellProductId;
      plan.newSellCode = mapping.get(t.sellProductId).target;
    }
    if (t.sellProductId != null && testIds.has(t.sellProductId)) zztestRefs.push(t.id);
    const offer = Array.isArray(t.offer_products) ? t.offer_products : [];
    if (offer.some((l) => l && mapping.has(Number(l.productId)))) {
      plan.prevOfferProducts = offer;
      plan.offerCodes = offer.map((l) =>
        l && mapping.has(Number(l.productId)) ? mapping.get(Number(l.productId)).target : null,
      );
    }
    if (plan.newSellCode || plan.offerCodes) taskPlans.push(plan);
  }
  if (zztestRefs.length > 0) {
    console.warn(`ATTENZIONE: ${zztestRefs.length} task puntano a prodotti ZZTEST (non rimappati):`, zztestRefs);
  }

  // --- Riepilogo piano ---
  const perTarget = {};
  for (const { target, confidence } of mapping.values()) {
    perTarget[target] ??= { exact: 0, close: 0, fallback: 0 };
    perTarget[target][confidence]++;
  }
  const insertPlan = TARGET_CATEGORIES.map((name) => ({
    categoria: name,
    da_inserire: NEW_PRODUCTS.filter((p) => p.categoria === name).length,
    da_archiviare: oldActive.filter((p) => p.category_id === targetCatIds[name]).length,
  }));
  console.log("\nPiano insert/archive:");
  console.table(insertPlan);
  console.log("Mappature per prodotto nuovo (vecchi prodotti che vi confluiscono):");
  console.table(perTarget);
  const fallbacks = [...mapping.values()].filter((m) => m.confidence === "fallback");
  console.log(`\nMappature FALLBACK da rivedere (${fallbacks.length}):`);
  for (const m of fallbacks.slice(0, 60)) {
    console.log(`  [${m.old.internal_code ?? "-"}] ${m.old.name}  ->  ${m.target}`);
  }
  console.log(`\nTask da rimappare: ${taskPlans.length} (sellProductId: ${taskPlans.filter((t) => t.newSellCode).length}, offer_products: ${taskPlans.filter((t) => t.offerCodes).length})`);

  const report = {
    mode: APPLY ? "apply" : "dry-run",
    applied: false,
    at: new Date().toISOString(),
    site_id: siteId,
    insertPlan,
    mapping: [...mapping.values()].map((m) => ({
      oldId: m.old.id,
      oldCode: m.old.internal_code,
      oldName: m.old.name,
      oldArchived2026: oldArchiveCat ? m.old.category_id === oldArchiveCat.id : false,
      domain: m.domain,
      target: m.target,
      confidence: m.confidence,
    })),
    zztestTaskRefs: zztestRefs,
    taskRemapCount: taskPlans.length,
    insertedIds: [],
    coeff: { created: [], deletedTelaio: [] },
    taskRemaps: [],
    archived: [],
  };
  flushReport(report);

  if (!APPLY) {
    console.log(`\nDRY-RUN completato: nessuna scrittura. Report mappature in ${path.basename(REPORT_PATH)}.`);
    return;
  }

  // ---------------------------------------------------------------- APPLY
  // 1) INSERT nuovi prodotti
  const payloads = NEW_PRODUCTS.map((p) => ({
    site_id: siteId,
    category_id: targetCatIds[p.categoria],
    name: p.name,
    type: p.subcategory,
    subcategory: p.subcategory,
    description: null,
    price_list: true,
    active: true,
    internal_code: p.internal_code,
    modalita_prezzo: p.modalita_prezzo,
    famiglia_apertura_cod: p.famiglia_apertura_cod,
    cod_tipo_cassone: p.cod_tipo_cassone ?? null,
  }));
  const insertedIds = [];
  const codeToNewId = new Map();
  try {
    for (let i = 0; i < payloads.length; i += INSERT_BATCH) {
      const batch = payloads.slice(i, i + INSERT_BATCH);
      const { data, error } = await supabase
        .from("SellProduct")
        .insert(batch)
        .select("id, internal_code");
      if (error) throw error;
      for (const row of data || []) {
        insertedIds.push(row.id);
        codeToNewId.set(row.internal_code, row.id);
      }
    }
    console.log(`inseriti ${insertedIds.length}/${payloads.length} prodotti`);
  } catch (e) {
    console.error("INSERT error, rollback degli inseriti:", e?.message || e);
    for (let i = 0; i < insertedIds.length; i += 200) {
      await supabase.from("SellProduct").delete().in("id", insertedIds.slice(i, i + 200)).eq("site_id", siteId);
    }
    throw e;
  }
  report.insertedIds = insertedIds;
  flushReport(report);

  const rollbackInserted = async () => {
    for (let i = 0; i < insertedIds.length; i += 200) {
      await supabase.from("SellProduct").delete().in("id", insertedIds.slice(i, i + 200)).eq("site_id", siteId);
    }
  };

  // 2) Coefficienti: upsert nuovi + delete telaio obsoleti
  try {
    const { data: existingCoeff, error: exErr } = await supabase
      .from("listino_coefficienti")
      .select("id, categoria, codice, descrizione, moltiplicatore, attivo, site_id")
      .eq("site_id", siteId);
    if (exErr) throw exErr;
    const existingKey = new Set((existingCoeff || []).map((c) => `${c.categoria}|${c.codice}`));

    const coeffRows = NEW_COEFFICIENTI.map((c) => ({
      site_id: siteId,
      categoria: c.categoria,
      codice: c.codice,
      descrizione: c.descrizione,
      moltiplicatore: 1.0,
      attivo: false,
    }));
    const { error: upErr } = await supabase
      .from("listino_coefficienti")
      .upsert(coeffRows, { onConflict: "site_id,categoria,codice", ignoreDuplicates: true });
    if (upErr) {
      if (String(upErr.code) === "23514") {
        throw new Error(
          "CHECK violation su listino_coefficienti: applica prima la migration 20260816090000_coeff_materiale_arredamento.sql.",
        );
      }
      throw upErr;
    }
    report.coeff.created = NEW_COEFFICIENTI.filter(
      (c) => !existingKey.has(`${c.categoria}|${c.codice}`),
    ).map((c) => ({ categoria: c.categoria, codice: c.codice }));

    const obsolete = (existingCoeff || []).filter(
      (c) => c.categoria === "telaio" && OBSOLETE_TELAIO_CODES.includes(c.codice),
    );
    if (obsolete.length > 0) {
      const { error: delErr } = await supabase
        .from("listino_coefficienti")
        .delete()
        .eq("site_id", siteId)
        .eq("categoria", "telaio")
        .in("codice", OBSOLETE_TELAIO_CODES);
      if (delErr) throw delErr;
    }
    report.coeff.deletedTelaio = obsolete;
    console.log(`coefficienti: creati ${report.coeff.created.length}, eliminati telaio obsoleti ${obsolete.length}`);
  } catch (e) {
    console.error("COEFF error, rollback dei prodotti inseriti:", e?.message || e);
    await rollbackInserted();
    throw e;
  }
  flushReport(report);

  // 3) Remap Task.sellProductId + 4) offer_products (per task, con prev nel report)
  for (const plan of taskPlans) {
    const patch = {};
    if (plan.newSellCode) patch.sellProductId = codeToNewId.get(plan.newSellCode);
    if (plan.prevOfferProducts) {
      patch.offer_products = plan.prevOfferProducts.map((l, idx) => {
        const code = plan.offerCodes[idx];
        return code ? { ...l, productId: codeToNewId.get(code) } : l;
      });
    }
    const { error } = await supabase.from("Task").update(patch).eq("id", plan.taskId).eq("site_id", siteId);
    if (error) {
      console.error(`REMAP error sul task ${plan.taskId}:`, error.message);
      throw error; // i task già rimappati restano: recuperabili con --down
    }
    report.taskRemaps.push({
      taskId: plan.taskId,
      prevSellProductId: plan.prevSellProductId,
      newSellProductId: patch.sellProductId,
      prevOfferProducts: plan.prevOfferProducts,
    });
  }
  console.log(`rimappati ${report.taskRemaps.length} task`);
  flushReport(report);

  // 5) Archivia i vecchi prodotti attivi nelle 3 categorie
  let archiveCat = catByNorm.get(normalize(ARCHIVE_CATEGORY_NAME)) ?? null;
  if (!archiveCat) {
    const { data, error } = await supabase
      .from("sellproduct_categories")
      .insert({ site_id: siteId, name: ARCHIVE_CATEGORY_NAME })
      .select("id, name")
      .single();
    if (error) throw error;
    archiveCat = data;
  }
  const insertedSet = new Set(insertedIds);
  const toArchive = oldActive.filter((p) => !insertedSet.has(p.id));
  for (const p of toArchive) {
    const { error } = await supabase
      .from("SellProduct")
      .update({ category_id: archiveCat.id, active: false })
      .eq("id", p.id)
      .eq("site_id", siteId);
    if (error) throw error;
    report.archived.push({ id: p.id, prevCategoryId: p.category_id, prevActive: p.active });
  }
  console.log(`archiviati ${report.archived.length} prodotti in "${ARCHIVE_CATEGORY_NAME}" (id ${archiveCat.id})`);

  report.applied = true;
  report.archiveCategoryId = archiveCat.id;
  flushReport(report);
  console.log("\nAPPLY completato:", {
    inserted: insertedIds.length,
    coeffCreated: report.coeff.created.length,
    taskRemaps: report.taskRemaps.length,
    archived: report.archived.length,
  });
}

async function main() {
  console.log(`MODE: ${DOWN ? "DOWN (ripristino)" : "UP (rinnovo)"} | ${APPLY ? "APPLY (writes)" : "DRY-RUN (no writes)"}`);
  const supabase = makeSupabase();
  const siteId = await resolveSite(supabase);
  if (DOWN) await down(supabase, siteId);
  else await up(supabase, siteId);
}

main().catch((e) => {
  console.error("RINNOVO FAILED:", e?.message || e);
  process.exit(1);
});
