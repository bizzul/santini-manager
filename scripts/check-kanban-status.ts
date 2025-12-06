/**
 * Script per controllare lo stato delle kanban e categorie
 * Utile per debug
 * 
 * Usage: bun run scripts/check-kanban-status.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkKanbanStatus() {
  try {
    console.log("🔍 Controllo stato Kanban e Categorie\n");
    console.log("=".repeat(60));

    // Get all sites
    const { data: sites, error: sitesError } = await supabase
      .from("sites")
      .select("id, name, subdomain");

    if (sitesError) {
      throw new Error(`Error fetching sites: ${sitesError.message}`);
    }

    for (const site of sites || []) {
      console.log(`\n🏢 Site: ${site.name} (${site.subdomain})`);
      console.log("─".repeat(60));

      // Get categories
      const { data: categories, error: catError } = await supabase
        .from("KanbanCategory")
        .select("*")
        .eq("site_id", site.id)
        .order("display_order");

      if (catError) {
        console.error("  ❌ Errore nel fetch categorie:", catError.message);
        continue;
      }

      console.log(`\n  📁 CATEGORIE (${categories?.length || 0}):`);
      if (categories && categories.length > 0) {
        categories.forEach((cat) => {
          console.log(`    [ID: ${cat.id}] ${cat.name} (${cat.identifier})`);
          console.log(`      → Color: ${cat.color}, Order: ${cat.display_order}`);
        });
      } else {
        console.log("    ⚠️  Nessuna categoria trovata");
      }

      // Get kanbans
      const { data: kanbans, error: kanbansError } = await supabase
        .from("Kanban")
        .select(`
          *,
          category:KanbanCategory(*)
        `)
        .eq("site_id", site.id);

      if (kanbansError) {
        console.error("  ❌ Errore nel fetch kanban:", kanbansError.message);
        continue;
      }

      console.log(`\n  📋 KANBAN (${kanbans?.length || 0}):`);
      if (kanbans && kanbans.length > 0) {
        kanbans.forEach((kanban: any) => {
          const categoryName = kanban.category?.name || "❌ NESSUNA";
          const categoryIcon = kanban.category ? "✓" : "○";
          
          console.log(`    ${categoryIcon} [ID: ${kanban.id}] ${kanban.title}`);
          console.log(`      → Identifier: ${kanban.identifier}`);
          console.log(`      → Category ID: ${kanban.category_id || "null"}`);
          console.log(`      → Category: ${categoryName}`);
          
          // Check for broken references
          if (kanban.category_id && !kanban.category) {
            console.log(`      ⚠️  ATTENZIONE: category_id=${kanban.category_id} ma categoria non trovata!`);
          }
        });
      } else {
        console.log("    ⚠️  Nessuna kanban trovata");
      }

      // Check for broken references
      if (kanbans && kanbans.length > 0) {
        const brokenRefs = kanbans.filter(
          (k: any) => k.category_id && !k.category
        );
        
        if (brokenRefs.length > 0) {
          console.log(`\n  ⚠️  ATTENZIONE: ${brokenRefs.length} kanban con riferimenti a categorie inesistenti!`);
          brokenRefs.forEach((k: any) => {
            console.log(`    - ${k.title} (category_id: ${k.category_id})`);
          });
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Controllo completato\n");

  } catch (error) {
    console.error("\n❌ Errore:", error);
    process.exit(1);
  }
}

checkKanbanStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script fallito:", error);
    process.exit(1);
  });

