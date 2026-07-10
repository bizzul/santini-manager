/**
 * Limita gli accessi di tutti gli utenti dello spazio "Estrella" in modo che
 * abbiano accesso SOLO all'organizzazione Estrella AG e al sito Estrella.
 *
 * "Utenti dello spazio estrella" = unione di:
 *   - membri del sito Estrella (user_sites)
 *   - membri dell'organizzazione Estrella AG (user_organizations)
 *
 * Per ciascun utente:
 *   - rimuove tutte le membership org diverse da Estrella AG
 *   - rimuove tutte le membership site diverse da Estrella
 *   - garantisce la presenza di Estrella AG (org) ed Estrella (site)
 *
 * I superadmin vengono ignorati (non hanno righe nelle junction).
 *
 * Dry-run di default. Per applicare le modifiche:
 *   APPLY=1 npx tsx --env-file=.env.local scripts/limit-estrella-users-access.ts
 * Anteprima (dry-run):
 *   npx tsx --env-file=.env.local scripts/limit-estrella-users-access.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

// Subdomain(s) dello spazio target: da CLI args o env SUBDOMAINS, default estrella.
// Es: npx tsx ... scripts/limit-estrella-users-access.ts santini scherman
const CLI_SUBDOMAINS = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const SUBDOMAINS = CLI_SUBDOMAINS.length > 0
    ? CLI_SUBDOMAINS
    : (process.env.SUBDOMAINS?.split(",").map((s) => s.trim()).filter(Boolean) ||
        ["estrella"]);
const APPLY = process.env.APPLY === "1";

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase env vars. Run with --env-file=.env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function processSpace(SUBDOMAIN: string) {
    // 1. Risolvi il sito e la sua organizzazione
    const { data: site, error: siteErr } = await supabase
        .from("sites")
        .select("id, name, organization_id")
        .eq("subdomain", SUBDOMAIN)
        .maybeSingle();

    if (siteErr || !site) {
        throw new Error(`Sito "${SUBDOMAIN}" non trovato: ${siteErr?.message}`);
    }

    const estrellaSiteId = site.id as string;
    const estrellaOrgId = site.organization_id as string;

    const { data: org } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", estrellaOrgId)
        .maybeSingle();

    console.log(
        `\n=== Spazio "${SUBDOMAIN}" → sito "${site.name}" (${estrellaSiteId})` +
            `, org "${org?.name}" (${estrellaOrgId}) ===\n`,
    );

    // 2. Trova gli utenti dello spazio (unione site + org)
    const [{ data: siteMembers }, { data: orgMembers }] = await Promise.all([
        supabase.from("user_sites").select("user_id").eq(
            "site_id",
            estrellaSiteId,
        ),
        supabase.from("user_organizations").select("user_id").eq(
            "organization_id",
            estrellaOrgId,
        ),
    ]);

    const userIds = Array.from(
        new Set([
            ...(siteMembers?.map((m: any) => m.user_id) || []),
            ...(orgMembers?.map((m: any) => m.user_id) || []),
        ]),
    );

    if (userIds.length === 0) {
        console.log("Nessun utente trovato per lo spazio Estrella.");
        return;
    }

    // 3. Profili (per role/email/nome) — esclude i superadmin
    const { data: profiles } = await supabase
        .from("User")
        .select("authId, email, given_name, family_name, role")
        .in("authId", userIds);

    // 4. Mappe nomi org/siti per output leggibile
    const [{ data: allOrgs }, { data: allSites }] = await Promise.all([
        supabase.from("organizations").select("id, name"),
        supabase.from("sites").select("id, name"),
    ]);
    const orgName = (id: string) =>
        allOrgs?.find((o: any) => o.id === id)?.name || id;
    const siteName = (id: string) =>
        allSites?.find((s: any) => s.id === id)?.name || id;

    console.log(
        `${APPLY ? "APPLY" : "DRY-RUN"} — ${userIds.length} utenti candidati\n`,
    );

    let changedCount = 0;

    for (const userId of userIds) {
        const profile = profiles?.find((p: any) => p.authId === userId);
        const label = profile
            ? `${profile.given_name || ""} ${profile.family_name || ""}`.trim() +
                ` <${profile.email}> [${profile.role}]`
            : `${userId} (profilo mancante)`;

        if (profile?.role === "superadmin") {
            console.log(`- SKIP superadmin: ${label}`);
            continue;
        }

        const [{ data: userOrgs }, { data: userSites }] = await Promise.all([
            supabase.from("user_organizations").select(
                "id, organization_id",
            ).eq("user_id", userId),
            supabase.from("user_sites").select("id, site_id").eq(
                "user_id",
                userId,
            ),
        ]);

        const orgsToRemove = (userOrgs || []).filter(
            (o: any) => o.organization_id !== estrellaOrgId,
        );
        const sitesToRemove = (userSites || []).filter(
            (s: any) => s.site_id !== estrellaSiteId,
        );
        const hasEstrellaOrg = (userOrgs || []).some(
            (o: any) => o.organization_id === estrellaOrgId,
        );
        const hasEstrellaSite = (userSites || []).some(
            (s: any) => s.site_id === estrellaSiteId,
        );

        const actions: string[] = [];
        orgsToRemove.forEach((o: any) =>
            actions.push(`− org ${orgName(o.organization_id)}`)
        );
        sitesToRemove.forEach((s: any) =>
            actions.push(`− sito ${siteName(s.site_id)}`)
        );
        if (!hasEstrellaOrg) actions.push(`+ org ${orgName(estrellaOrgId)}`);
        if (!hasEstrellaSite) actions.push(`+ sito ${siteName(estrellaSiteId)}`);

        if (actions.length === 0) {
            console.log(`- OK (già corretto): ${label}`);
            continue;
        }

        changedCount++;
        console.log(`- ${label}`);
        actions.forEach((a) => console.log(`    ${a}`));

        if (!APPLY) continue;

        // Applica: rimuovi org/siti extra
        if (orgsToRemove.length > 0) {
            const { error } = await supabase
                .from("user_organizations")
                .delete()
                .in("id", orgsToRemove.map((o: any) => o.id));
            if (error) console.error(`    ! errore rimozione org: ${error.message}`);
        }
        if (sitesToRemove.length > 0) {
            const { error } = await supabase
                .from("user_sites")
                .delete()
                .in("id", sitesToRemove.map((s: any) => s.id));
            if (error) {
                console.error(`    ! errore rimozione siti: ${error.message}`);
            }
        }
        // Garantisci Estrella org/site
        if (!hasEstrellaOrg) {
            const { error } = await supabase
                .from("user_organizations")
                .insert({ user_id: userId, organization_id: estrellaOrgId });
            if (error) console.error(`    ! errore add org: ${error.message}`);
        }
        if (!hasEstrellaSite) {
            const { error } = await supabase
                .from("user_sites")
                .insert({ user_id: userId, site_id: estrellaSiteId });
            if (error) console.error(`    ! errore add sito: ${error.message}`);
        }
    }

    console.log(
        `\n[${SUBDOMAIN}] ${APPLY ? "Applicate" : "Da applicare"} modifiche a ${changedCount} utenti.` +
            (APPLY ? "" : " Esegui con APPLY=1 per applicare.") + "\n",
    );
}

async function main() {
    if (process.env.LIST === "1") {
        const { data } = await supabase
            .from("sites")
            .select("name, subdomain, organization_id")
            .order("name");
        console.table(data);
        return;
    }
    console.log(
        `\nTarget spazi: ${SUBDOMAINS.join(", ")} — modalità: ${
            APPLY ? "APPLY" : "DRY-RUN"
        }`,
    );
    for (const subdomain of SUBDOMAINS) {
        try {
            await processSpace(subdomain);
        } catch (e) {
            console.error(
                `\n[${subdomain}] ERRORE: ${
                    e instanceof Error ? e.message : e
                }\n`,
            );
        }
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
