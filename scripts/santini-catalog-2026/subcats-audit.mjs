// READ-ONLY: elenca le sottocategorie-immagine (sellproduct_subcategory_images)
// per Arredamento/Porte/Serramenti e conta i prodotti ATTIVI collegati, per
// individuare i contenitori legacy vuoti (0 attivi) rimasti dopo l'archiviazione.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const env = {};
for (const line of readFileSync(path.join(repoRoot, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[m[1]] = v;
}
const supabase = createClient(
  env.STORAGE_SUPABASE_URL,
  env.STORAGE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const SITE = "7ce3bca0-2293-4328-bee3-b8347c581b5b";
const TARGETS = { Arredamento: 6, Porte: 3, Serramenti: 8 };

const norm = (v) =>
  (v || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

async function activeSubcatCounts(categoryId) {
  const counts = new Map();
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
      const key = norm(p.subcategory || p.type || "");
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    if (!data || data.length < 1000) break;
  }
  return counts;
}

async function main() {
  for (const [name, cid] of Object.entries(TARGETS)) {
    console.log("\n================ " + name + " (category_id=" + cid + ") ================");
    const active = await activeSubcatCounts(cid);

    const { data: imgs, error } = await supabase
      .from("sellproduct_subcategory_images")
      .select("id, subcategory_key, subcategory_name, image_url, sort_order")
      .eq("site_id", SITE)
      .eq("category_id", cid)
      .order("subcategory_name");
    if (error) throw error;

    const rows = (imgs || []).map((r) => {
      const key = norm(r.subcategory_name || r.subcategory_key);
      return {
        subcategory_name: r.subcategory_name,
        subcategory_key: r.subcategory_key,
        attivi: active.get(key) || 0,
        has_image: r.image_url ? "sì" : "",
        id: r.id,
      };
    });
    const empty = rows.filter((r) => r.attivi === 0);
    const nonEmpty = rows.filter((r) => r.attivi > 0);
    console.log(`Image rows totali: ${rows.length} | VUOTE (0 attivi): ${empty.length} | con prodotti: ${nonEmpty.length}`);
    console.log("-- VUOTE (candidate a rimozione) --");
    console.table(empty.map(({ id, ...r }) => r));
    if (nonEmpty.length) {
      console.log("-- con prodotti attivi (da MANTENERE) --");
      console.table(nonEmpty.map(({ id, ...r }) => r));
    }

    // Sottocategorie ATTIVE senza image row (nuove famiglie non ancora corredate di immagine)
    const imgKeys = new Set(rows.map((r) => norm(r.subcategory_name || r.subcategory_key)));
    const missingImg = [...active.entries()]
      .filter(([k]) => k && !imgKeys.has(k))
      .map(([k, n]) => ({ sottocategoria_attiva_senza_immagine: k, attivi: n }));
    if (missingImg.length) {
      console.log("-- sottocategorie ATTIVE senza image row (info) --");
      console.table(missingImg);
    }
  }
}
main().catch((e) => {
  console.error("AUDIT ERROR:", e?.message || e);
  process.exit(1);
});
