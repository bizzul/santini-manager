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

async function fixUserSiteAccess(userEmail: string, siteName: string) {
    console.log("\n=== FIX ACCESSO UTENTE AL SITO ===\n");

    // 1. Find user
    console.log(`🔍 Cercando utente: ${userEmail}...`);
    const { data: authUser, error: authError } = await supabase.auth.admin
        .listUsers();

    if (authError) {
        console.error("❌ Errore:", authError);
        return;
    }

    const user = authUser.users.find((u) => u.email === userEmail);
    if (!user) {
        console.error(`❌ Utente non trovato: ${userEmail}`);
        return;
    }

    console.log(`✅ Utente trovato: ${user.email} (ID: ${user.id})\n`);

    // 2. Find site
    console.log(`🔍 Cercando sito: ${siteName}...`);
    const { data: sites, error: sitesError } = await supabase
        .from("sites")
        .select("*")
        .or(`name.ilike.%${siteName}%,subdomain.ilike.%${siteName}%`);

    if (sitesError) {
        console.error("❌ Errore:", sitesError);
        return;
    }

    if (!sites || sites.length === 0) {
        console.error(`❌ Nessun sito trovato con nome/subdomain: ${siteName}`);
        return;
    }

    if (sites.length > 1) {
        console.log("⚠️  Trovati più siti. Per favore scegli:");
        sites.forEach((s, i) => {
            console.log(`   ${i + 1}. ${s.name} (${s.subdomain})`);
        });
        console.log(
            "\nRilancia lo script con un nome più specifico o modificalo manualmente.",
        );
        return;
    }

    const site = sites[0];
    console.log(`✅ Sito trovato: ${site.name} (${site.subdomain})`);
    console.log(`   - Organization ID: ${site.organization_id}\n`);

    if (!site.organization_id) {
        console.error(
            "❌ Il sito non ha un organization_id! Il sito deve essere associato ad un'organizzazione.",
        );
        return;
    }

    // 3. Check if user already has access
    console.log("🔍 Verificando accesso esistente...");
    const { data: existingAccess, error: accessError } = await supabase
        .from("user_organizations")
        .select("*")
        .eq("user_id", user.id)
        .eq("organization_id", site.organization_id);

    if (accessError) {
        console.error("❌ Errore:", accessError);
        return;
    }

    if (existingAccess && existingAccess.length > 0) {
        console.log(
            "✅ L'utente ha già accesso a questa organizzazione!\n",
        );
        console.log("Il problema potrebbe essere altrove. Controlla:");
        console.log("   1. I cookie del browser (prova a cancellare i cookie)");
        console.log("   2. Le policy RLS nel database");
        console.log(
            "   3. La configurazione delle variabili d'ambiente (NEXT_PUBLIC_ROOT_DOMAIN, ecc.)",
        );
        return;
    }

    // 4. Add user to organization
    console.log(
        "🔧 Aggiungendo l'utente all'organizzazione...",
    );
    const { data: newAccess, error: insertError } = await supabase
        .from("user_organizations")
        .insert({
            user_id: user.id,
            organization_id: site.organization_id,
        })
        .select();

    if (insertError) {
        console.error("❌ Errore nell'aggiunta:", insertError);
        return;
    }

    console.log("✅ Utente aggiunto all'organizzazione con successo!\n");
    console.log("Dettagli:");
    console.log(`   - User ID: ${user.id}`);
    console.log(`   - Organization ID: ${site.organization_id}`);
    console.log(`   - Sito: ${site.name} (${site.subdomain})\n`);

    console.log(
        "🎉 FATTO! L'utente dovrebbe ora poter accedere al sito.",
    );
    console.log(
        "   Prova a fare logout e login di nuovo per vedere le modifiche.\n",
    );

    console.log("=== FINE ===\n");
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
    console.log(
        "Usage: bun run scripts/fix-user-site-access.ts <user-email> <site-name>",
    );
    console.log("\nExample:");
    console.log(
        "  bun run scripts/fix-user-site-access.ts user@example.com santini",
    );
    process.exit(1);
}

const userEmail = args[0];
const siteName = args[1];

fixUserSiteAccess(userEmail, siteName);
