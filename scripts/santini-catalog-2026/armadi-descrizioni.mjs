// =============================================================================
// ARMADI CASSONE — descrizioni prodotti + sottocategoria
// =============================================================================
//
//  Popola la descrizione (SellProduct.description) degli 8 Armadi cassone e la
//  descrizione della sottocategoria "Armadi" (sellproduct_subcategory_images).
//
//  SICUREZZA:
//   - Default = DRY-RUN (nessuna scrittura). Passa --apply per eseguire.
//   - Idempotente (update per internal_code / upsert per sottocategoria).
//
//  Usage:
//   node scripts/santini-catalog-2026/armadi-descrizioni.mjs           # dry-run
//   node scripts/santini-catalog-2026/armadi-descrizioni.mjs --apply   # esegue
// =============================================================================
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const APPLY = process.argv.includes("--apply");

const ARMADI_CATEGORY = "Arredamento";
const ARMADI_SUBCATEGORY = "Armadi";

// Descrizioni prodotto (una frase completa ciascuna), per internal_code.
const PRODUCT_DESCRIPTIONS = {
  "ARM-CASSONE-MURO":
    "Armadio a muro con cassone modulare in truciolato, realizzato su misura in larghezza e altezza con profondita ed esecuzione delle ante configurabili in offerta.",
  "ARM-CASSONE-SCORR2":
    "Armadio con due ante scorrevoli e cassone modulare in truciolato, dimensionabile su misura in larghezza, altezza e profondita.",
  "ARM-CASSONE-SCORR3":
    "Armadio con tre o piu ante scorrevoli e cassone modulare in truciolato, configurabile su misura per grandi larghezze.",
  "ARM-CASSONE-ANGOLO":
    "Armadio scorrevole ad angolo con cassone modulare in truciolato, ideale per sfruttare gli spigoli, con profondita ed esecuzione ante a scelta.",
  "ARM-CASSONE-BATTENTE":
    "Armadio standard a battente con cassone modulare in truciolato, su misura in larghezza e altezza con esecuzione delle ante a scelta.",
  "ARM-CASSONE-SPECCHIO":
    "Armadio con specchio integrato e cassone modulare in truciolato, su misura con profondita ed esecuzione ante configurabili.",
  "ARM-CASSONE-CABINA":
    "Cabina armadio con struttura a cassone modulare in truciolato, completamente configurabile su misura in larghezza, altezza e profondita.",
  "ARM-CASSONE-GUARDAROBA":
    "Guardaroba con cassone modulare in truciolato, dimensionabile su misura con profondita ed esecuzione delle ante a scelta.",
};

// Descrizione sottocategoria (una frase).
const SUBCATEGORY_DESCRIPTION =
  "Armadi modulari a cassone in truciolato, componibili su misura in larghezza e altezza con profondita ed esecuzione delle ante configurabili in offerta.";

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
  console.log("ARMADI CASSONE — DESCRIZIONI (prodotti + sottocategoria)");
  console.log(`MODE : ${APPLY ? "APPLY (writes)" : "DRY-RUN (no writes)"}`);
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

  // Categoria Arredamento
  const { data: cat, error: cErr } = await supabase
    .from("sellproduct_categories")
    .select("id")
    .eq("site_id", siteId)
    .eq("name", ARMADI_CATEGORY)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!cat) throw new Error(`Categoria "${ARMADI_CATEGORY}" non trovata`);
  const categoryId = cat.id;

  // 1) Descrizioni prodotto
  console.log("Descrizioni prodotto:");
  for (const [code, description] of Object.entries(PRODUCT_DESCRIPTIONS)) {
    console.log(`  ${code}: ${description.slice(0, 60)}...`);
    if (!APPLY) continue;
    const { error } = await supabase
      .from("SellProduct")
      .update({ description })
      .eq("site_id", siteId)
      .eq("internal_code", code);
    if (error) throw error;
  }

  // 2) Descrizione sottocategoria "Armadi"
  console.log(`\nSottocategoria "${ARMADI_SUBCATEGORY}" (cat ${categoryId}):`);
  console.log(`  ${SUBCATEGORY_DESCRIPTION}`);
  if (APPLY) {
    const { error } = await supabase.from("sellproduct_subcategory_images").upsert(
      {
        site_id: siteId,
        category_id: categoryId,
        subcategory_key: ARMADI_SUBCATEGORY,
        subcategory_name: ARMADI_SUBCATEGORY,
        description: SUBCATEGORY_DESCRIPTION,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "site_id,category_id,subcategory_key" },
    );
    if (error) throw error;
  }

  console.log(`\n${APPLY ? "✔ Descrizioni applicate." : "ℹ Dry-run: nessuna scrittura. Aggiungi --apply per eseguire."}`);
}

main().catch((e) => {
  console.error("ERRORE:", e.message || e);
  process.exit(1);
});
