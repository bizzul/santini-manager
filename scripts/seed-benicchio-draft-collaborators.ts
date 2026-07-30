/**
 * Crea i collaboratori Benicchio SA come utenti bozza (non attivati, nessuna email).
 *
 * Fonte: team benicchio.ch (Giorgio Benicchio, Jil Ghelfa, Alessio Cefis, Luana Bistoletti-Doninelli)
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-benicchio-draft-collaborators.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = "benicchio";

const AVATAR_PALETTE = [
    "#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#f43f5e",
    "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e",
    "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
];

const COLLABORATORS = [
    {
        given_name: "Giorgio",
        family_name: "Benicchio",
        company_role: "CEO",
        email: "giorgio.benicchio@benicchio.ch",
    },
    {
        given_name: "Jil",
        family_name: "Ghelfa",
        company_role: "Responsabile costruzione",
        email: "jil.ghelfa@benicchio.ch",
    },
    {
        given_name: "Alessio",
        family_name: "Cefis",
        company_role: "Responsabile manutenzione",
        email: "alessio.cefis@benicchio.ch",
    },
    {
        given_name: "Luana",
        family_name: "Bistoletti-Doninelli",
        company_role: "Responsabile di contatto",
        email: "luana.bistoletti-doninelli@benicchio.ch",
    },
];

function pickColor(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function buildInitials(given: string, family: string): string {
    return `${given.charAt(0)}${family.charAt(0)}`.toUpperCase();
}

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase env vars. Run with --env-file=.env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function resolveSiteContext() {
    const { data: site, error } = await supabase
        .from("sites")
        .select("id, organization_id")
        .eq("subdomain", SUBDOMAIN)
        .maybeSingle();

    if (error || !site?.id || !site.organization_id) {
        throw new Error(
            error?.message || `Site "${SUBDOMAIN}" non trovato o senza organization_id`,
        );
    }

    return { siteId: site.id, organizationId: site.organization_id as string };
}

async function ensureSiteMembership(
    authId: string,
    siteId: string,
    organizationId: string,
) {
    const { data: existingSite } = await supabase
        .from("user_sites")
        .select("id")
        .eq("site_id", siteId)
        .eq("user_id", authId)
        .maybeSingle();

    if (!existingSite) {
        const { error } = await supabase.from("user_sites").insert({
            site_id: siteId,
            user_id: authId,
        });
        if (error) throw new Error(`user_sites: ${error.message}`);
    }

    const { data: existingOrg } = await supabase
        .from("user_organizations")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", authId)
        .maybeSingle();

    if (!existingOrg) {
        const { error } = await supabase.from("user_organizations").insert({
            organization_id: organizationId,
            user_id: authId,
        });
        if (error && !error.message.includes("duplicate")) {
            throw new Error(`user_organizations: ${error.message}`);
        }
    }
}

async function main() {
    const { siteId, organizationId } = await resolveSiteContext();
    console.log(`Seeding Benicchio draft collaborators (site ${siteId})...\n`);

    let created = 0;
    let skipped = 0;

    for (const person of COLLABORATORS) {
        const { data: existing } = await supabase
            .from("User")
            .select("authId, activation_status, enabled")
            .eq("email", person.email)
            .maybeSingle();

        if (existing?.authId) {
            await ensureSiteMembership(existing.authId, siteId, organizationId);
            console.log(`↷ ${person.given_name} ${person.family_name} — già presente, collegato al sito`);
            skipped++;
            continue;
        }

        const { data: createData, error: createError } = await supabase.auth.admin
            .createUser({
                email: person.email,
                email_confirm: true,
                user_metadata: {
                    name: person.given_name,
                    last_name: person.family_name,
                    role: "user",
                },
            });

        if (createError) {
            throw new Error(`auth ${person.email}: ${createError.message}`);
        }

        const userId = createData.user.id;
        const color = pickColor(`${person.given_name} ${person.family_name}`);

        const { error: profileError } = await supabase.from("User").insert({
            authId: userId,
            auth_id: userId,
            email: person.email,
            given_name: person.given_name,
            family_name: person.family_name,
            company_role: person.company_role,
            initials: buildInitials(person.given_name, person.family_name),
            color,
            role: "user",
            enabled: false,
            activation_status: "draft",
        });

        if (profileError) {
            throw new Error(`User ${person.email}: ${profileError.message}`);
        }

        await ensureSiteMembership(userId, siteId, organizationId);
        console.log(`✓ ${person.given_name} ${person.family_name} — bozza (${person.company_role})`);
        created++;
    }

    console.log(`\nFatto: ${created} create, ${skipped} già esistenti.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
