/**
 * Script to seed default Kanban categories for existing sites
 * 
 * This script creates two default categories (Ufficio and Produzione) 
 * for all sites that don't have any categories yet.
 * 
 * Usage: bun run scripts/seed-kanban-categories.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DEFAULT_CATEGORIES = [
  {
    name: "Ufficio",
    identifier: "ufficio",
    description: "Kanban per attività d'ufficio e amministrazione",
    icon: "Briefcase",
    color: "#3B82F6", // Blue
    display_order: 0,
  },
  {
    name: "Produzione",
    identifier: "produzione",
    description: "Kanban per attività di produzione e lavorazione",
    icon: "Factory",
    color: "#F59E0B", // Orange
    display_order: 1,
  },
];

async function seedKanbanCategories() {
  try {
    console.log("🚀 Starting Kanban categories seeding...\n");

    // Get all sites
    const { data: sites, error: sitesError } = await supabase
      .from("sites")
      .select("id, name, subdomain");

    if (sitesError) {
      throw new Error(`Error fetching sites: ${sitesError.message}`);
    }

    if (!sites || sites.length === 0) {
      console.log("ℹ️  No sites found. Nothing to seed.");
      return;
    }

    console.log(`📊 Found ${sites.length} site(s)\n`);

    let sitesProcessed = 0;
    let sitesSkipped = 0;
    let categoriesCreated = 0;

    for (const site of sites) {
      console.log(`Processing site: ${site.name} (${site.subdomain})...`);

      // Check if site already has categories
      const { data: existingCategories, error: checkError } = await supabase
        .from("KanbanCategory")
        .select("id")
        .eq("site_id", site.id);

      if (checkError) {
        console.error(
          `  ❌ Error checking categories for site ${site.name}:`,
          checkError.message
        );
        continue;
      }

      if (existingCategories && existingCategories.length > 0) {
        console.log(
          `  ⏭️  Site already has ${existingCategories.length} categor${existingCategories.length === 1 ? "y" : "ies"}. Skipping.\n`
        );
        sitesSkipped++;
        continue;
      }

      // Create default categories for this site
      const categoriesToCreate = DEFAULT_CATEGORIES.map((cat) => ({
        ...cat,
        site_id: site.id,
      }));

      const { data: createdCategories, error: createError } = await supabase
        .from("KanbanCategory")
        .insert(categoriesToCreate)
        .select();

      if (createError) {
        console.error(
          `  ❌ Error creating categories for site ${site.name}:`,
          createError.message
        );
        continue;
      }

      console.log(
        `  ✅ Created ${createdCategories?.length || 0} default categor${createdCategories?.length === 1 ? "y" : "ies"}`
      );
      categoriesCreated += createdCategories?.length || 0;
      sitesProcessed++;

      // Optionally: Update existing kanbans to assign them to categories based on naming
      const { data: kanbans, error: kanbansError } = await supabase
        .from("Kanban")
        .select("id, title, identifier")
        .eq("site_id", site.id)
        .is("category_id", null);

      if (!kanbansError && kanbans && kanbans.length > 0) {
        console.log(`  📝 Found ${kanbans.length} uncategorized kanban(s)`);

        let kanbansUpdated = 0;

        for (const kanban of kanbans) {
          // Try to match kanban to category based on identifier or title
          const lowerTitle = kanban.title?.toLowerCase() || "";
          const lowerIdentifier = kanban.identifier?.toLowerCase() || "";

          let categoryId = null;

          if (
            lowerTitle.includes("ufficio") ||
            lowerIdentifier.includes("ufficio") ||
            lowerTitle.includes("office") ||
            lowerIdentifier.includes("office")
          ) {
            // Find Ufficio category
            const ufficioCategory = createdCategories?.find(
              (c) => c.identifier === "ufficio"
            );
            categoryId = ufficioCategory?.id;
          } else if (
            lowerTitle.includes("produzione") ||
            lowerIdentifier.includes("produzione") ||
            lowerTitle.includes("production") ||
            lowerIdentifier.includes("production")
          ) {
            // Find Produzione category
            const produzioneCategory = createdCategories?.find(
              (c) => c.identifier === "produzione"
            );
            categoryId = produzioneCategory?.id;
          }

          if (categoryId) {
            const { error: updateError } = await supabase
              .from("Kanban")
              .update({ category_id: categoryId })
              .eq("id", kanban.id);

            if (!updateError) {
              kanbansUpdated++;
              console.log(
                `    ✓ Assigned "${kanban.title}" to category`
              );
            }
          }
        }

        if (kanbansUpdated > 0) {
          console.log(
            `  📌 Assigned ${kanbansUpdated} kanban(s) to categories`
          );
        }
      }

      console.log(); // Empty line for readability
    }

    console.log("\n" + "=".repeat(50));
    console.log("✨ Seeding completed!");
    console.log(`  Sites processed: ${sitesProcessed}`);
    console.log(`  Sites skipped: ${sitesSkipped}`);
    console.log(`  Categories created: ${categoriesCreated}`);
    console.log("=".repeat(50) + "\n");
  } catch (error) {
    console.error("\n❌ Fatal error during seeding:");
    console.error(error);
    process.exit(1);
  }
}

// Run the seeding
seedKanbanCategories()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

