import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

async function diagnoseSiteAccess(userEmail: string, siteName?: string) {
  console.log("\n=== DIAGNOSI ACCESSO SITO ===\n");

  // 1. Find user by email
  console.log(`🔍 Cercando utente con email: ${userEmail}...`);
  const { data: authUser, error: authError } = await supabase.auth.admin
    .listUsers();

  if (authError) {
    console.error("❌ Errore nel recupero utenti:", authError);
    return;
  }

  const user = authUser.users.find((u) => u.email === userEmail);
  if (!user) {
    console.error(`❌ Utente non trovato con email: ${userEmail}`);
    return;
  }

  console.log(`✅ Utente trovato:`);
  console.log(`   - ID: ${user.id}`);
  console.log(`   - Email: ${user.email}\n`);

  // 2. Check User table
  console.log("🔍 Verificando dati nella tabella User...");
  const { data: userData, error: userError } = await supabase
    .from("User")
    .select("*")
    .eq("authId", user.id);

  if (userError) {
    console.error("❌ Errore nel recupero User:", userError);
  } else if (!userData || userData.length === 0) {
    console.error("❌ Nessun record trovato nella tabella User!");
  } else {
    console.log(`✅ Record User trovato:`);
    console.log(`   - Role: ${userData[0].role}`);
    console.log(`   - Created: ${userData[0].createdAt}\n`);
  }

  // 3. Check user_organizations
  console.log("🔍 Verificando user_organizations...");
  const { data: userOrgs, error: userOrgsError } = await supabase
    .from("user_organizations")
    .select("*, organization:organizations(*)")
    .eq("user_id", user.id);

  if (userOrgsError) {
    console.error("❌ Errore nel recupero user_organizations:", userOrgsError);
  } else if (!userOrgs || userOrgs.length === 0) {
    console.error(
      "❌ PROBLEMA TROVATO: Nessuna organizzazione associata all'utente!",
    );
    console.log(
      "   Questo potrebbe essere il motivo per cui non riesce ad accedere.\n",
    );
  } else {
    console.log(`✅ Organizzazioni trovate: ${userOrgs.length}`);
    userOrgs.forEach((uo: any) => {
      console.log(`   - ${uo.organization?.name} (ID: ${uo.organization_id})`);
    });
    console.log("");
  }

  // 4. Check sites
  console.log("🔍 Verificando tutti i siti...");
  const { data: allSites, error: sitesError } = await supabase
    .from("sites")
    .select("*");

  if (sitesError) {
    console.error("❌ Errore nel recupero siti:", sitesError);
    return;
  }

  if (!allSites || allSites.length === 0) {
    console.error("❌ Nessun sito trovato nel database!");
    return;
  }

  console.log(`✅ Siti totali nel database: ${allSites.length}\n`);

  // If site name provided, focus on that site
  if (siteName) {
    console.log(`🔍 Analizzando sito specifico: "${siteName}"...\n`);
    const site = allSites.find(
      (s) =>
        s.name?.toLowerCase() === siteName.toLowerCase() ||
        s.subdomain?.toLowerCase() === siteName.toLowerCase(),
    );

    if (!site) {
      console.error(
        `❌ Sito non trovato con nome/subdomain: ${siteName}\n`,
      );
      console.log("Siti disponibili:");
      allSites.forEach((s) => {
        console.log(`   - ${s.name} (subdomain: ${s.subdomain})`);
      });
      return;
    }

    console.log(`✅ Sito trovato:`);
    console.log(`   - Nome: ${site.name}`);
    console.log(`   - Subdomain: ${site.subdomain}`);
    console.log(`   - Organization ID: ${site.organization_id}`);
    console.log(`   - Custom Domain: ${site.custom_domain || "N/A"}\n`);

    // Check if user has access to this site's organization
    if (userOrgs && userOrgs.length > 0) {
      const hasAccess = userOrgs.some(
        (uo: any) => uo.organization_id === site.organization_id,
      );

      if (hasAccess) {
        console.log(
          "✅ L'utente ha accesso all'organizzazione di questo sito!\n",
        );
      } else {
        console.error(
          "❌ PROBLEMA TROVATO: L'utente NON ha accesso all'organizzazione di questo sito!",
        );
        console.log(`   - Sito organization_id: ${site.organization_id}`);
        console.log(
          `   - Utente organization_ids: ${userOrgs.map((uo: any) => uo.organization_id).join(", ")}`,
        );
        console.log(
          "\n   🔧 SOLUZIONE: Aggiungi l'utente all'organizzazione corretta.\n",
        );
      }
    }

    // Check user_sites direct assignment
    console.log("🔍 Verificando user_sites (accesso diretto)...");
    const { data: userSites, error: userSitesError } = await supabase
      .from("user_sites")
      .select("*")
      .eq("user_id", user.id)
      .eq("site_id", site.id);

    if (userSitesError) {
      console.error("❌ Errore nel recupero user_sites:", userSitesError);
    } else if (!userSites || userSites.length === 0) {
      console.log(
        "ℹ️  Nessun accesso diretto al sito tramite user_sites (questo è OK se l'utente ha accesso tramite organizzazione)\n",
      );
    } else {
      console.log("✅ L'utente ha accesso diretto al sito tramite user_sites!\n");
    }
  } else {
    // Show all sites with access information
    console.log("📋 Analisi accesso per tutti i siti:\n");
    allSites.forEach((site) => {
      const hasOrgAccess = userOrgs?.some(
        (uo: any) => uo.organization_id === site.organization_id,
      );
      console.log(
        `   ${hasOrgAccess ? "✅" : "❌"} ${site.name} (${site.subdomain})`,
      );
      if (!hasOrgAccess) {
        console.log(
          `      - Organization ID del sito: ${site.organization_id}`,
        );
      }
    });
  }

  console.log("\n=== FINE DIAGNOSI ===\n");
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.log("Usage: bun run scripts/diagnose-site-access.ts <user-email> [site-name]");
  console.log("\nExamples:");
  console.log("  bun run scripts/diagnose-site-access.ts user@example.com");
  console.log("  bun run scripts/diagnose-site-access.ts user@example.com santini");
  process.exit(1);
}

const userEmail = args[0];
const siteName = args[1];

diagnoseSiteAccess(userEmail, siteName);

