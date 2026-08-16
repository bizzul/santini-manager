// Audit read-only post-rinnovo ago 2026. Nessuna scrittura.
// Usage: node scripts/santini-catalog-2026/rinnovo-ago-2026/verify-rinnovo.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");

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

const normalize = (v) =>
  (v || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

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

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "OK " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(
    env.STORAGE_SUPABASE_URL || env.STORAGE_NEXT_PUBLIC_SUPABASE_URL,
    env.STORAGE_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: cats } = await supabase
    .from("sellproduct_categories")
    .select("id, name")
    .eq("site_id", SITE_ID);
  const catByNorm = new Map((cats || []).map((c) => [normalize(c.name), c]));

  const products = await pageAll((from, to) =>
    supabase
      .from("SellProduct")
      .select("id, internal_code, name, category_id, active, modalita_prezzo, famiglia_apertura_cod")
      .eq("site_id", SITE_ID)
      .range(from, to),
  );

  // 1) Conteggi attivi per categoria
  const expected = { Serramenti: 10, Porte: 6, Arredamento: 25 };
  for (const [name, exp] of Object.entries(expected)) {
    const cat = catByNorm.get(normalize(name));
    const active = products.filter((p) => p.category_id === cat?.id && p.active);
    check(`${name}: ${exp} prodotti attivi`, active.length === exp, `trovati ${active.length}`);
  }

  // 2) Archivi senza attivi
  for (const name of [OLD_ARCHIVE_CATEGORY_NAME, ARCHIVE_CATEGORY_NAME]) {
    const cat = catByNorm.get(normalize(name));
    if (!cat) {
      check(`categoria "${name}" presente`, false);
      continue;
    }
    const active = products.filter((p) => p.category_id === cat.id && p.active);
    check(`"${name}": zero prodotti attivi`, active.length === 0, `attivi ${active.length}`);
  }
  // ZZTEST: solo nelle categorie toccate dal rinnovo (Accessori è fuori scope)
  const scopeIds = new Set(
    [...TARGET_CATEGORIES, OLD_ARCHIVE_CATEGORY_NAME, ARCHIVE_CATEGORY_NAME]
      .map((n) => catByNorm.get(normalize(n))?.id)
      .filter(Boolean),
  );
  const zztestActive = products.filter(
    (p) =>
      (p.internal_code || "").toUpperCase().startsWith("ZZTEST") &&
      p.active &&
      scopeIds.has(p.category_id),
  );
  check("zero ZZTEST attivi nelle categorie del rinnovo", zztestActive.length === 0, `attivi ${zztestActive.length}`);

  // 3) Nuovi prodotti presenti, griglia con famiglia, codici unici
  const byCode = new Map();
  for (const p of products) {
    if (!p.internal_code) continue;
    byCode.set(p.internal_code, [...(byCode.get(p.internal_code) || []), p]);
  }
  const dupes = [...byCode.entries()].filter(([, v]) => v.length > 1);
  check("internal_code unici nel sito", dupes.length === 0, dupes.map(([k]) => k).join(", "));
  const missing = NEW_PRODUCTS.filter((p) => !byCode.has(p.internal_code));
  check("tutti i 41 nuovi codici presenti", missing.length === 0, missing.map((p) => p.internal_code).join(", "));
  const badGriglia = products.filter(
    (p) => p.active && p.modalita_prezzo === "griglia" && !p.famiglia_apertura_cod,
  );
  check("ogni prodotto 'griglia' attivo ha famiglia", badGriglia.length === 0, `${badGriglia.length} senza`);

  const newIds = new Set(
    NEW_PRODUCTS.map((p) => byCode.get(p.internal_code)?.[0]?.id).filter(Boolean),
  );

  // 4) Task: nessun riferimento fuori dal nuovo catalogo (per le 3 categorie)
  const inactiveIds = new Set(products.filter((p) => !p.active).map((p) => p.id));
  const tasks = await pageAll((from, to) =>
    supabase
      .from("Task")
      .select("id, sellProductId, offer_products")
      .eq("site_id", SITE_ID)
      .range(from, to),
  );
  const badSell = tasks.filter(
    (t) => t.sellProductId != null && inactiveIds.has(t.sellProductId),
  );
  check("zero task con sellProductId su prodotto inattivo", badSell.length === 0,
    badSell.slice(0, 10).map((t) => t.id).join(", "));
  const badOffer = [];
  for (const t of tasks) {
    const offer = Array.isArray(t.offer_products) ? t.offer_products : [];
    if (offer.some((l) => l && l.productId != null && inactiveIds.has(Number(l.productId)))) {
      badOffer.push(t.id);
    }
  }
  check("zero task con offer_products su prodotto inattivo", badOffer.length === 0,
    badOffer.slice(0, 10).join(", "));
  const sellOnNew = tasks.filter((t) => t.sellProductId != null && newIds.has(t.sellProductId)).length;
  console.log(`info: task con sellProductId sul nuovo catalogo: ${sellOnNew}`);

  // 5) Coefficienti
  const { data: coeff } = await supabase
    .from("listino_coefficienti")
    .select("categoria, codice")
    .eq("site_id", SITE_ID);
  const coeffKey = new Set((coeff || []).map((c) => `${c.categoria}|${c.codice}`));
  const missingCoeff = NEW_COEFFICIENTI.filter((c) => !coeffKey.has(`${c.categoria}|${c.codice}`));
  check("tutti i coefficienti nuovi presenti", missingCoeff.length === 0,
    missingCoeff.map((c) => `${c.categoria}/${c.codice}`).join(", "));
  const staleTelaio = (coeff || []).filter(
    (c) => c.categoria === "telaio" && OBSOLETE_TELAIO_CODES.includes(c.codice),
  );
  check("telaio obsoleti (APL/CTA/CTL) rimossi", staleTelaio.length === 0,
    staleTelaio.map((c) => c.codice).join(", "));

  console.log(failures === 0 ? "\nVERIFICA SUPERATA" : `\nVERIFICA FALLITA: ${failures} check`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("VERIFY FAILED:", e?.message || e);
  process.exit(1);
});
