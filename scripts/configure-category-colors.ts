/**
 * Configura il flag show_category_colors sui kanban.
 *
 * Regola: attivo SOLO sui kanban che contengono progetti di categorie miste
 * (offerte, AVOR, posa). Spento sui kanban mono-categoria (arredamento,
 * porte, serramenti, service, ecc.) dove il colore sarebbe comunque uniforme.
 *
 * Usage:
 *   DRY RUN:  bun run scripts/configure-category-colors.ts
 *   APPLY:    bun run scripts/configure-category-colors.ts --apply
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Carica .env.local
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "❌ Variabili d'ambiente mancanti (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ENABLE_PATTERNS = [/offert/i, /avor/i, /posa/i];

const APPLY = process.argv.includes("--apply");

function shouldEnable(kanban: { name?: string | null; identifier?: string | null }) {
  const haystack = `${kanban.identifier || ""} ${kanban.name || ""}`;
  return ENABLE_PATTERNS.some((re) => re.test(haystack));
}

async function main() {
  console.log(
    `\n🚀 configure-category-colors ${APPLY ? "(APPLY)" : "(DRY RUN)"}\n`
  );

  const { data: kanbans, error } = await supabase
    .from("Kanban")
    .select("id, name, identifier, show_category_colors, site_id")
    .order("site_id", { ascending: true })
    .order("identifier", { ascending: true });

  if (error) {
    console.error("❌ Errore fetch kanban:", error.message);
    process.exit(1);
  }

  if (!kanbans || kanbans.length === 0) {
    console.log("ℹ️  Nessun kanban trovato.");
    return;
  }

  console.log(`📊 Trovati ${kanbans.length} kanban totali\n`);

  const toEnable: typeof kanbans = [];
  const toDisable: typeof kanbans = [];
  const unchanged: typeof kanbans = [];

  for (const k of kanbans) {
    const desired = shouldEnable(k);
    if (desired === !!k.show_category_colors) {
      unchanged.push(k);
    } else if (desired) {
      toEnable.push(k);
    } else {
      toDisable.push(k);
    }
  }

  const fmt = (k: (typeof kanbans)[number]) =>
    `   [${k.id}] ${k.identifier || "-"} · ${k.name || "-"} (site ${k.site_id})`;

  console.log(`✅ Da ATTIVARE (${toEnable.length}):`);
  toEnable.forEach((k) => console.log(fmt(k)));

  console.log(`\n🔕 Da DISATTIVARE (${toDisable.length}):`);
  toDisable.forEach((k) => console.log(fmt(k)));

  console.log(`\n⏸  Invariati (${unchanged.length}):`);
  unchanged.forEach((k) =>
    console.log(
      `   [${k.id}] ${k.identifier || "-"} · ${k.name || "-"} (${
        k.show_category_colors ? "ON" : "OFF"
      })`
    )
  );

  if (!APPLY) {
    console.log(
      "\nℹ️  Dry run completato. Ri-esegui con --apply per salvare le modifiche."
    );
    return;
  }

  console.log("\n💾 Applico modifiche...");

  if (toEnable.length > 0) {
    const { error: enableError } = await supabase
      .from("Kanban")
      .update({ show_category_colors: true })
      .in(
        "id",
        toEnable.map((k) => k.id)
      );
    if (enableError) {
      console.error("❌ Errore attivazione:", enableError.message);
      process.exit(1);
    }
    console.log(`   ✅ Attivati ${toEnable.length} kanban`);
  }

  if (toDisable.length > 0) {
    const { error: disableError } = await supabase
      .from("Kanban")
      .update({ show_category_colors: false })
      .in(
        "id",
        toDisable.map((k) => k.id)
      );
    if (disableError) {
      console.error("❌ Errore disattivazione:", disableError.message);
      process.exit(1);
    }
    console.log(`   ✅ Disattivati ${toDisable.length} kanban`);
  }

  console.log("\n🏁 Fatto.\n");
}

main().catch((err) => {
  console.error("❌ Errore imprevisto:", err);
  process.exit(1);
});
