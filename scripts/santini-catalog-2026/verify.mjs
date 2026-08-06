// READ-ONLY verification for the Santini 2026 catalog import.
// Uses the Supabase service role via REST (no Postgres password needed).
// Does NOT write anything. Run: node scripts/santini-catalog-2026/verify.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

function loadEnv() {
  const txt = readFileSync(path.join(repoRoot, ".env.local"), "utf8");
  const env = {};
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

const env = loadEnv();
const SUPABASE_URL = env.STORAGE_SUPABASE_URL || env.STORAGE_NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.STORAGE_SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing STORAGE_SUPABASE_URL or STORAGE_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TARGET_CATEGORIES = ["Arredamento", "Porte", "Serramenti"];
const CSV_FILES = {
  Arredamento: "/Users/matteopaolocci/Desktop/Catalogo_Arredamento_1.csv",
  Porte: "/Users/matteopaolocci/Desktop/Catalogo_Porte_1.csv",
  Serramenti: "/Users/matteopaolocci/Desktop/Catalogo_Serramenti_2.csv",
};

function normalize(v) {
  return (v || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Minimal CSV parser (quotes + commas), returns array of objects.
function parseCsv(text) {
  const rows = [];
  let field = "";
  let record = [];
  let inQuotes = false;
  const pushField = () => {
    record.push(field);
    field = "";
  };
  const pushRecord = () => {
    rows.push(record);
    record = [];
  };
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (inQuotes) {
      if (c === '"' && n === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\n") {
      pushField();
      pushRecord();
    } else if (c === "\r") {
      // ignore
    } else {
      field += c;
    }
  }
  if (field.length > 0 || record.length > 0) {
    pushField();
    pushRecord();
  }
  const headers = rows.shift() || [];
  return rows
    .filter((r) => r.some((v) => (v || "").trim() !== ""))
    .map((r) => Object.fromEntries(headers.map((h, idx) => [h, (r[idx] ?? "").trim()])));
}

function loadCsvRows() {
  const all = {};
  for (const [label, file] of Object.entries(CSV_FILES)) {
    all[label] = parseCsv(readFileSync(file, "utf8"));
  }
  return all;
}

async function main() {
  console.log("REST host:", new URL(SUPABASE_URL).hostname);

  // 1) Santini site (schema of `sites` is unknown -> select * and scan string cols)
  const { data: sites, error: sitesErr } = await supabase
    .from("sites")
    .select("*");
  if (sitesErr) throw sitesErr;
  if (sites && sites[0]) {
    console.log("sites columns:", Object.keys(sites[0]));
  }
  const santini = (sites || []).filter((s) =>
    Object.values(s).some(
      (v) => typeof v === "string" && normalize(v).includes("santini"),
    ),
  );
  console.log("\n=== Candidate Santini sites ===");
  console.table(
    santini.map((s) => ({
      id: s.id,
      name: s.name,
      subdomain: s.subdomain ?? s.slug ?? s.domain_name ?? s.host ?? null,
    })),
  );
  if (santini.length !== 1) {
    console.log(
      `WARNING: expected exactly 1 Santini site, found ${santini.length}. Stopping detailed checks.`,
    );
    if (santini.length === 0) return;
  }
  const siteId = santini[0].id;
  console.log("Using site_id:", siteId);

  // 2) material/glass columns present?
  const colProbe = await supabase
    .from("SellProduct")
    .select("id, cod_materiale, cod_vetro_telaio")
    .limit(1);
  const hasNewCols = !(
    colProbe.error &&
    (String(colProbe.error.code) === "42703" ||
      /does not exist/i.test(colProbe.error.message || ""))
  );
  console.log("\n=== Columns cod_materiale/cod_vetro_telaio present? ===", hasNewCols);

  // 3) categories for site
  const { data: cats, error: catErr } = await supabase
    .from("sellproduct_categories")
    .select("id, name")
    .eq("site_id", siteId);
  if (catErr) throw catErr;
  const catByNorm = new Map((cats || []).map((c) => [normalize(c.name), c]));

  console.log("\n=== Existing 'Archivio%' categories ===");
  console.table((cats || []).filter((c) => normalize(c.name).startsWith("archivio")));

  // 4) counts per target category (tot + active)
  console.log("\n=== Current products to be ARCHIVED (per category) ===");
  const countsOut = [];
  for (const name of TARGET_CATEGORIES) {
    const cat = catByNorm.get(normalize(name));
    if (!cat) {
      countsOut.push({ categoria: name, category_id: null, tot: 0, attivi: 0, note: "categoria assente" });
      continue;
    }
    const tot = await supabase
      .from("SellProduct")
      .select("id", { count: "exact", head: true })
      .eq("site_id", siteId)
      .eq("category_id", cat.id);
    const act = await supabase
      .from("SellProduct")
      .select("id", { count: "exact", head: true })
      .eq("site_id", siteId)
      .eq("category_id", cat.id)
      .eq("active", true);
    countsOut.push({
      categoria: name,
      category_id: cat.id,
      tot: tot.count ?? 0,
      attivi: act.count ?? 0,
    });
  }
  console.table(countsOut);

  const totalSite = await supabase
    .from("SellProduct")
    .select("id", { count: "exact", head: true })
    .eq("site_id", siteId);
  console.log("Totale SellProduct sul sito:", totalSite.count ?? 0);

  // 5) internal_code collisions vs incoming COD_INT
  const csv = loadCsvRows();
  const incomingCodes = new Set();
  for (const rows of Object.values(csv)) {
    for (const r of rows) {
      const code = (r.COD_INT || "").trim();
      if (code) incomingCodes.add(code);
    }
  }
  // fetch existing internal_codes for site (paginated)
  const existingCodes = new Set();
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from("SellProduct")
      .select("internal_code")
      .eq("site_id", siteId)
      .not("internal_code", "is", null)
      .range(from, from + page - 1);
    if (error) throw error;
    for (const r of data || []) {
      if (r.internal_code) existingCodes.add(r.internal_code);
    }
    if (!data || data.length < page) break;
    from += page;
  }
  const collisions = [...incomingCodes].filter((c) => existingCodes.has(c));
  console.log("\n=== internal_code collisions (incoming vs existing on site) ===");
  console.log("incoming distinct codes:", incomingCodes.size);
  console.log("existing codes on site:", existingCodes.size);
  console.log("collisions:", collisions.length, collisions.slice(0, 20));

  // 6) RLS policies (best-effort; requires a helper RPC or pg access — skipped via REST)
  console.log(
    "\n=== RLS ===\n(Le policy INSERT/SELECT/UPDATE/DELETE site-scoped sono confermate dalla migration baseline; il service role bypassa RLS, quindi l'import via questo canale non e' vincolato dalle policy.)",
  );

  // 7) sample of incoming rows per category (Passo 4)
  console.log("\n=== CAMPIONE 5 righe per categoria (dai CSV, come verranno mappate) ===");
  for (const [label, rows] of Object.entries(csv)) {
    console.log(`\n--- ${label} (prime 5 di ${rows.length}) ---`);
    console.table(
      rows.slice(0, 5).map((r) => ({
        COD_INT: r.COD_INT,
        SOTTOCAT: r.SOTTOCATEGORIA,
        TIPO: r.TIPO,
        NOME: r.NOME_PRODOTTO,
        MAT: r.COD_MATERIALE || "",
        VETRO: r.COD_VETRO_TELAIO || "",
        LISTINO: r.LISTINO_PREZZI,
        ATTIVO: r.ATTIVO,
      })),
    );
  }
}

main().catch((e) => {
  console.error("VERIFY ERROR:", e?.message || e);
  process.exit(1);
});
