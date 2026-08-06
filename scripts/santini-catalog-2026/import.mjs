// Santini 2026 catalog import (Arredamento / Porte / Serramenti).
// Channel: Supabase service role via REST (bypasses RLS; site_id set explicitly).
//
// SAFETY:
//  - Default mode is DRY-RUN (no writes). Pass --apply to perform changes.
//  - Order in --apply: (1) insert new products, (2) archive old ones. If an
//    insert batch fails, all rows inserted in THIS run are deleted (rollback)
//    and the archive step is skipped, leaving the old catalog untouched.
//  - internal_code has a UNIQUE(site_id, internal_code) index -> re-running
//    --apply after a successful run will FAIL on duplicates (intended guard).
//
// Usage:
//   node scripts/santini-catalog-2026/import.mjs            # dry-run
//   node scripts/santini-catalog-2026/import.mjs --apply    # execute
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const APPLY = process.argv.includes("--apply");

const TARGET_CATEGORIES = ["Arredamento", "Porte", "Serramenti"];
const ARCHIVE_CATEGORY_NAME = "Archivio 2026";
const CSV_FILES = {
  Arredamento: "/Users/matteopaolocci/Desktop/Catalogo_Arredamento_1.csv",
  Porte: "/Users/matteopaolocci/Desktop/Catalogo_Porte_1.csv",
  Serramenti: "/Users/matteopaolocci/Desktop/Catalogo_Serramenti_2.csv",
};
const TRUE_VALUES = new Set(["SI", "SÌ", "YES", "1", "TRUE", "VERO"]);
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
  return (v || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function bool(v) {
  return TRUE_VALUES.has(String(v || "").trim().toUpperCase());
}
function nullify(v) {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

function parseCsv(text) {
  const rows = [];
  let field = "";
  let record = [];
  let inQuotes = false;
  const pushField = () => (record.push(field), (field = ""));
  const pushRecord = () => (rows.push(record), (record = []));
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (inQuotes) {
      if (c === '"' && n === '"') (field += '"'), i++;
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") pushField();
    else if (c === "\n") (pushField(), pushRecord());
    else if (c === "\r") {
      /* ignore */
    } else field += c;
  }
  if (field.length > 0 || record.length > 0) (pushField(), pushRecord());
  const headers = rows.shift() || [];
  return rows
    .filter((r) => r.some((v) => (v || "").trim() !== ""))
    .map((r) => Object.fromEntries(headers.map((h, idx) => [h, (r[idx] ?? "").trim()])));
}

function loadRows() {
  const out = [];
  for (const [label, file] of Object.entries(CSV_FILES)) {
    const rows = parseCsv(readFileSync(file, "utf8"));
    for (const r of rows) {
      if (!r.CATEGORIA || !r.SOTTOCATEGORIA || !r.NOME_PRODOTTO) continue;
      out.push({ __file: label, ...r });
    }
  }
  return out;
}

async function main() {
  const env = loadEnv();
  const SUPABASE_URL = env.STORAGE_SUPABASE_URL || env.STORAGE_NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = env.STORAGE_SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Missing Supabase REST env vars");
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`MODE: ${APPLY ? "APPLY (writes enabled)" : "DRY-RUN (no writes)"}`);

  // Resolve Santini site
  const { data: sites, error: sErr } = await supabase.from("sites").select("*");
  if (sErr) throw sErr;
  const santini = (sites || []).filter((s) =>
    Object.values(s).some((v) => typeof v === "string" && normalize(v).includes("santini")),
  );
  if (santini.length !== 1) throw new Error(`Expected 1 Santini site, found ${santini.length}`);
  const siteId = santini[0].id;
  console.log("site:", santini[0].name, "| id:", siteId);

  // New columns present?
  const probe = await supabase.from("SellProduct").select("id, cod_materiale, cod_vetro_telaio").limit(1);
  const hasNewCols = !(
    probe.error &&
    (String(probe.error.code) === "42703" || /does not exist/i.test(probe.error.message || ""))
  );
  console.log("cod_materiale/cod_vetro_telaio present:", hasNewCols);
  if (APPLY && !hasNewCols) {
    throw new Error(
      "Colonne cod_materiale/cod_vetro_telaio assenti: applica prima la migration 20260806140000_sellproduct_add_material_glass.sql.",
    );
  }

  // Categories for site
  const { data: cats, error: cErr } = await supabase
    .from("sellproduct_categories")
    .select("id, name")
    .eq("site_id", siteId);
  if (cErr) throw cErr;
  const catByNorm = new Map((cats || []).map((c) => [normalize(c.name), c]));

  const ensureCategory = async (name) => {
    const found = catByNorm.get(normalize(name));
    if (found) return found.id;
    if (!APPLY) return null; // dry-run: report as "to create"
    const { data, error } = await supabase
      .from("sellproduct_categories")
      .insert({ site_id: siteId, name })
      .select("id, name")
      .single();
    if (error) throw error;
    catByNorm.set(normalize(name), data);
    return data.id;
  };

  // Target category ids (must exist already)
  const targetCatIds = {};
  for (const name of TARGET_CATEGORIES) {
    const c = catByNorm.get(normalize(name));
    targetCatIds[name] = c ? c.id : null;
  }
  console.log("target category ids:", targetCatIds);

  const rows = loadRows();
  console.log("CSV valid rows:", rows.length);

  // Preflight: code collisions
  const incoming = rows.map((r) => (r.COD_INT || "").trim()).filter(Boolean);
  const incomingSet = new Set(incoming);
  const existingCodes = new Set();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("SellProduct")
      .select("internal_code")
      .eq("site_id", siteId)
      .not("internal_code", "is", null)
      .range(from, from + 999);
    if (error) throw error;
    (data || []).forEach((r) => r.internal_code && existingCodes.add(r.internal_code));
    if (!data || data.length < 1000) break;
  }
  const collisions = [...incomingSet].filter((c) => existingCodes.has(c));
  console.log("code collisions with existing:", collisions.length, collisions.slice(0, 10));
  if (collisions.length > 0) throw new Error("Collisioni internal_code: import annullato.");

  // Archive plan counts
  const archivePlan = [];
  for (const name of TARGET_CATEGORIES) {
    const cid = targetCatIds[name];
    if (!cid) {
      archivePlan.push({ categoria: name, category_id: null, da_archiviare: 0 });
      continue;
    }
    const { count } = await supabase
      .from("SellProduct")
      .select("id", { count: "exact", head: true })
      .eq("site_id", siteId)
      .eq("category_id", cid);
    archivePlan.push({ categoria: name, category_id: cid, da_archiviare: count ?? 0 });
  }
  console.log("ARCHIVE plan:");
  console.table(archivePlan);
  const insertPlan = TARGET_CATEGORIES.map((name) => ({
    categoria: name,
    da_inserire: rows.filter((r) => normalize(r.CATEGORIA) === normalize(name)).length,
  }));
  console.log("INSERT plan:");
  console.table(insertPlan);

  if (!APPLY) {
    console.log("\nDRY-RUN completato: nessuna scrittura effettuata.");
    return;
  }

  // ---- APPLY ----
  // Ensure target + archive categories
  for (const name of TARGET_CATEGORIES) targetCatIds[name] = await ensureCategory(name);
  const archiveCatId = await ensureCategory(ARCHIVE_CATEGORY_NAME);
  console.log("Archivio 2026 category id:", archiveCatId);

  // Build insert payloads
  const payloads = rows.map((r) => {
    const sub = r.SOTTOCATEGORIA;
    const p = {
      site_id: siteId,
      category_id: targetCatIds[[...TARGET_CATEGORIES].find((n) => normalize(n) === normalize(r.CATEGORIA))],
      name: r.NOME_PRODOTTO,
      type: sub,
      subcategory: sub,
      tipo: nullify(r.TIPO),
      product_type: nullify(r.TIPO),
      description: nullify(r.DESCRIZIONE),
      price_list: bool(r.LISTINO_PREZZI),
      image_url: nullify(r.URL_IMMAGINE),
      doc_url: nullify(r.URL_DOC),
      active: bool(r.ATTIVO),
      internal_code: nullify(r.COD_INT),
    };
    if (hasNewCols) {
      p.cod_materiale = nullify(r.COD_MATERIALE);
      p.cod_vetro_telaio = nullify(r.COD_VETRO_TELAIO);
    }
    return p;
  });

  // 1) INSERT new products first (old catalog stays intact until inserts succeed)
  const insertedIds = [];
  try {
    for (let i = 0; i < payloads.length; i += INSERT_BATCH) {
      const batch = payloads.slice(i, i + INSERT_BATCH);
      const { data, error } = await supabase.from("SellProduct").insert(batch).select("id");
      if (error) throw error;
      (data || []).forEach((x) => insertedIds.push(x.id));
      console.log(`inserted ${insertedIds.length}/${payloads.length}`);
    }
  } catch (e) {
    console.error("INSERT error, rolling back inserted rows:", e?.message || e);
    for (let i = 0; i < insertedIds.length; i += 200) {
      const chunk = insertedIds.slice(i, i + 200);
      await supabase.from("SellProduct").delete().in("id", chunk).eq("site_id", siteId);
    }
    throw e;
  }

  // 2) ARCHIVE old products (move to Archivio 2026, active=false)
  const moved = [];
  for (const name of TARGET_CATEGORIES) {
    const cid = targetCatIds[name];
    if (!cid || cid === archiveCatId) continue;
    const { data, error } = await supabase
      .from("SellProduct")
      .update({ category_id: archiveCatId, active: false })
      .eq("site_id", siteId)
      .eq("category_id", cid)
      // do not touch the products we just inserted (they are active in target cats)
      .in("id", await oldProductIds(supabase, siteId, cid, insertedIds))
      .select("id");
    if (error) {
      console.error(`ARCHIVE error on ${name}:`, error.message);
      throw error;
    }
    (data || []).forEach((x) => moved.push(x.id));
    console.log(`archived ${name}: ${data?.length ?? 0}`);
  }

  const report = {
    site_id: siteId,
    archiveCategoryId: archiveCatId,
    inserted: insertedIds.length,
    archived: moved.length,
    insertedIds,
    archivedIds: moved,
    at: new Date().toISOString(),
  };
  writeFileSync(path.join(__dirname, "last-run-report.json"), JSON.stringify(report, null, 2));
  console.log("\nAPPLY completato:", { inserted: report.inserted, archived: report.archived });
}

// Returns ids of products in (siteId, categoryId) EXCLUDING the just-inserted ids.
async function oldProductIds(supabase, siteId, categoryId, insertedIds) {
  const excluded = new Set(insertedIds);
  const ids = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("SellProduct")
      .select("id")
      .eq("site_id", siteId)
      .eq("category_id", categoryId)
      .range(from, from + 999);
    if (error) throw error;
    (data || []).forEach((r) => !excluded.has(r.id) && ids.push(r.id));
    if (!data || data.length < 1000) break;
  }
  return ids;
}

main().catch((e) => {
  console.error("IMPORT FAILED:", e?.message || e);
  process.exit(1);
});
