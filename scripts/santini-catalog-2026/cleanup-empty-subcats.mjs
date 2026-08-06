// Rimuove le righe sellproduct_subcategory_images "vuote" (0 prodotti ATTIVI)
// nelle categorie target, residui legacy dopo l'archiviazione. NON tocca i
// prodotti ne' i loro collegamenti a progetti/offerte.
//
//   node scripts/santini-catalog-2026/cleanup-empty-subcats.mjs           # dry-run
//   node scripts/santini-catalog-2026/cleanup-empty-subcats.mjs --apply   # elimina
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const APPLY = process.argv.includes("--apply");
const env = {};
for (const line of readFileSync(path.join(repoRoot, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[m[1]] = v;
}
const supabase = createClient(env.STORAGE_SUPABASE_URL, env.STORAGE_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const SITE = "7ce3bca0-2293-4328-bee3-b8347c581b5b";
const TARGETS = { Arredamento: 6, Porte: 3, Serramenti: 8 };
const norm = (v) =>
  (v || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

async function activeSubcatKeys(categoryId) {
  const keys = new Set();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("SellProduct")
      .select("subcategory, type, active")
      .eq("site_id", SITE)
      .eq("category_id", categoryId)
      .range(from, from + 999);
    if (error) throw error;
    for (const p of data || []) {
      if (p.active === false) continue;
      keys.add(norm(p.subcategory || p.type || ""));
    }
    if (!data || data.length < 1000) break;
  }
  return keys;
}

async function main() {
  console.log(`MODE: ${APPLY ? "APPLY (delete enabled)" : "DRY-RUN (no writes)"}`);
  const toDelete = [];
  for (const [name, cid] of Object.entries(TARGETS)) {
    const activeKeys = await activeSubcatKeys(cid);
    const { data: imgs, error } = await supabase
      .from("sellproduct_subcategory_images")
      .select("id, subcategory_key, subcategory_name, image_url")
      .eq("site_id", SITE)
      .eq("category_id", cid);
    if (error) throw error;
    for (const r of imgs || []) {
      const key = norm(r.subcategory_name || r.subcategory_key);
      if (!activeKeys.has(key)) {
        toDelete.push({ categoria: name, category_id: cid, ...r });
      }
    }
  }
  console.log(`Image-row VUOTE da rimuovere: ${toDelete.length}`);
  console.table(toDelete.map(({ id, image_url, ...r }) => ({ ...r, has_image: image_url ? "sì" : "" })));

  if (!APPLY) {
    console.log("\nDRY-RUN: nessuna eliminazione. Aggiungi --apply per procedere.");
    return;
  }
  if (toDelete.length === 0) {
    console.log("Niente da eliminare.");
    return;
  }
  const ids = toDelete.map((r) => r.id);
  const { error } = await supabase
    .from("sellproduct_subcategory_images")
    .delete()
    .in("id", ids)
    .eq("site_id", SITE);
  if (error) throw error;
  console.log(`Eliminate ${ids.length} righe sellproduct_subcategory_images.`);
}
main().catch((e) => {
  console.error("CLEANUP ERROR:", e?.message || e);
  process.exit(1);
});
