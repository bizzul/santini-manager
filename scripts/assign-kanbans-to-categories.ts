/**
 * Script per assegnare manualmente le kanban esistenti alle categorie
 * 
 * Personalizza le mappature nell'oggetto KANBAN_MAPPINGS
 * 
 * Usage: bun run scripts/assign-kanbans-to-categories.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * PERSONALIZZA QUESTA MAPPATURA
 * 
 * Formato: 
 * "identifier_kanban": "identifier_categoria"
 * 
 * Esempio:
 * "kanban_ufficio_amministrazione": "ufficio"
 * "kanban_produzione_principale": "produzione"
 */
const KANBAN_MAPPINGS: Record<string, string> = {
  // Aggiungi qui le tue mappature
  // "identifier_kanban": "identifier_categoria",
};

async function assignKanbansToCategories() {
  try {
    console.log("🚀 Inizio assegnazione kanban alle categorie...\n");

    // Get all sites
    const { data: sites, error: sitesError } = await supabase
      .from("sites")
      .select("id, name, subdomain");

    if (sitesError) {
      throw new Error(`Error fetching sites: ${sitesError.message}`);
    }

    if (!sites || sites.length === 0) {
      console.log("ℹ️  Nessun site trovato.");
      return;
    }

    console.log(`📊 Trovati ${sites.length} site(s)\n`);

    for (const site of sites) {
      console.log(`\n🏢 Processando site: ${site.name} (${site.subdomain})`);
      console.log("=".repeat(50));

      // Get categories for this site
      const { data: categories, error: categoriesError } = await supabase
        .from("KanbanCategory")
        .select("*")
        .eq("site_id", site.id);

      if (categoriesError || !categories || categories.length === 0) {
        console.log("  ⚠️  Nessuna categoria trovata per questo site. Creale prima!");
        continue;
      }

      console.log(`  📁 Categorie disponibili:`);
      categories.forEach((cat) => {
        console.log(`    - ${cat.name} (${cat.identifier})`);
      });

      // Get kanbans for this site
      const { data: kanbans, error: kanbansError } = await supabase
        .from("Kanban")
        .select("*")
        .eq("site_id", site.id);

      if (kanbansError || !kanbans || kanbans.length === 0) {
        console.log("  ℹ️  Nessuna kanban trovata per questo site.");
        continue;
      }

      console.log(`\n  📋 Kanban trovate (${kanbans.length}):`);
      
      let assigned = 0;
      let skipped = 0;
      let errors = 0;

      for (const kanban of kanbans) {
        const statusIcon = kanban.category_id ? "✓" : "○";
        const categoryName = kanban.category_id 
          ? categories.find(c => c.id === kanban.category_id)?.name || "Unknown"
          : "Nessuna";
        
        console.log(`    ${statusIcon} "${kanban.title}" (${kanban.identifier}) → ${categoryName}`);

        // Se ha già una categoria, skip
        if (kanban.category_id) {
          skipped++;
          continue;
        }

        // Cerca una mappatura manuale
        let targetCategoryIdentifier = KANBAN_MAPPINGS[kanban.identifier];

        // Se non c'è mappatura manuale, prova con l'auto-detect
        if (!targetCategoryIdentifier) {
          const lowerTitle = kanban.title?.toLowerCase() || "";
          const lowerIdentifier = kanban.identifier?.toLowerCase() || "";

          if (
            lowerTitle.includes("ufficio") ||
            lowerIdentifier.includes("ufficio") ||
            lowerTitle.includes("office") ||
            lowerIdentifier.includes("office")
          ) {
            targetCategoryIdentifier = "ufficio";
          } else if (
            lowerTitle.includes("produzione") ||
            lowerIdentifier.includes("produzione") ||
            lowerTitle.includes("production") ||
            lowerIdentifier.includes("production")
          ) {
            targetCategoryIdentifier = "produzione";
          }
        }

        if (!targetCategoryIdentifier) {
          console.log(`      ⚠️  Nessuna categoria trovata per "${kanban.title}"`);
          skipped++;
          continue;
        }

        // Trova la categoria
        const targetCategory = categories.find(
          (c) => c.identifier === targetCategoryIdentifier
        );

        if (!targetCategory) {
          console.log(`      ❌ Categoria "${targetCategoryIdentifier}" non esiste`);
          errors++;
          continue;
        }

        // Assegna la categoria
        const { error: updateError } = await supabase
          .from("Kanban")
          .update({ category_id: targetCategory.id })
          .eq("id", kanban.id);

        if (updateError) {
          console.log(`      ❌ Errore nell'assegnazione: ${updateError.message}`);
          errors++;
        } else {
          console.log(`      ✅ Assegnata a "${targetCategory.name}"`);
          assigned++;
        }
      }

      console.log(`\n  📊 Riepilogo site ${site.name}:`);
      console.log(`    ✅ Assegnate: ${assigned}`);
      console.log(`    ⏭️  Saltate (già assegnate): ${skipped}`);
      console.log(`    ❌ Errori: ${errors}`);
    }

    console.log("\n" + "=".repeat(50));
    console.log("✨ Processo completato!");
    console.log("=".repeat(50) + "\n");

    console.log("\n💡 Suggerimento:");
    console.log("Se alcune kanban non sono state assegnate automaticamente,");
    console.log("puoi aggiungerle manualmente nell'oggetto KANBAN_MAPPINGS");
    console.log("all'inizio di questo script.\n");

  } catch (error) {
    console.error("\n❌ Errore fatale:", error);
    process.exit(1);
  }
}

// Run the script
assignKanbansToCategories()
  .then(() => {
    console.log("✅ Script completato con successo");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script fallito:", error);
    process.exit(1);
  });

