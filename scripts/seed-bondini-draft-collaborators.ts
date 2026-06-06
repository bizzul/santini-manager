/**
 * One-shot: create Studio Bondini collaborators as draft users (no email sent).
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/seed-bondini-draft-collaborators.ts \
 *     dotenv_config_path=.env.local
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const SITE_ID = "71cc58ba-1a58-4c8c-9ff8-7ebbfb3f2fe8";
const ORGANIZATION_ID = "7ceab7e6-83cf-47bf-b292-c6e740b24c16";

const AVATAR_PALETTE = [
    "#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#f43f5e",
    "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e",
    "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
];

const COLLABORATORS = [
    { given_name: "Marco", family_name: "Bondini", company_role: "Titolare", email: "bondini@studiobondini.ch" },
    { given_name: "Marta", family_name: "Anania", company_role: "Amministrazione", email: "anania@studiobondini.ch" },
    { given_name: "Andrea", family_name: "Babbucci", company_role: "Architetto", email: "babbucci@studiobondini.ch" },
    { given_name: "Greta", family_name: "Castiglioni", company_role: "Architetto", email: "castiglioni@studiobondini.ch" },
    { given_name: "Manuela", family_name: "Catolfi", company_role: "Amministrazione", email: "catolfi@studiobondini.ch" },
    { given_name: "Paola", family_name: "Galimberti", company_role: "Architetto", email: "galimberti@studiobondini.ch" },
    { given_name: "Alessandro", family_name: "Speroni", company_role: "Architetto", email: "speroni@studiobondini.ch" },
    { given_name: "Monica", family_name: "Trapletti", company_role: "Amministrazione", email: "trappletti@studiobondini.ch" },
    { given_name: "Gianna", family_name: "Tundo", company_role: "Architetto", email: "tundo@studiobondini.ch" },
];

function pickColor(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function initials(given: string, family: string): string {
    return `${given.charAt(0)}${family.charAt(0)}`.toUpperCase();
}

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase env vars. Load .env.local via dotenv/config.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function ensureSiteMembership(authId: string) {
    const { data: existingSite } = await supabase
        .from("user_sites")
        .select("id")
        .eq("site_id", SITE_ID)
        .eq("user_id", authId)
        .maybeSingle();

    if (!existingSite) {
        const { error } = await supabase.from("user_sites").insert({
            site_id: SITE_ID,
            user_id: authId,
        });
        if (error) throw new Error(`user_sites: ${error.message}`);
    }

    const { data: existingOrg } = await supabase
        .from("user_organizations")
        .select("id")
        .eq("organization_id", ORGANIZATION_ID)
        .eq("user_id", authId)
        .maybeSingle();

    if (!existingOrg) {
        const { error } = await supabase.from("user_organizations").insert({
            organization_id: ORGANIZATION_ID,
            user_id: authId,
        });
        if (error && !error.message.includes("duplicate")) {
            throw new Error(`user_organizations: ${error.message}`);
        }
    }
}

async function main() {
    console.log("Seeding Studio Bondini draft collaborators (no emails)...\n");

    let created = 0;
    let skipped = 0;
    let linked = 0;

    for (const person of COLLABORATORS) {
        const { data: existing } = await supabase
            .from("User")
            .select("authId, activation_status")
            .eq("email", person.email)
            .maybeSingle();

        if (existing?.authId) {
            await ensureSiteMembership(existing.authId);
            console.log(`↷ ${person.email} — già presente, collegato al sito`);
            skipped++;
            linked++;
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
            console.error(`✗ ${person.email} — auth: ${createError.message}`);
            continue;
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
            initials: initials(person.given_name, person.family_name),
            color,
            role: "user",
            enabled: false,
            activation_status: "draft",
        });

        if (profileError) {
            console.error(`✗ ${person.email} — profilo: ${profileError.message}`);
            continue;
        }

        await ensureSiteMembership(userId);
        console.log(`✓ ${person.email} — bozza creata (${person.company_role})`);
        created++;
    }

    console.log(`\nFatto: ${created} create, ${skipped} già esistenti (${linked} collegati al sito).`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
