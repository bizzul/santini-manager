/**
 * Seed a concentrated sample of clients + one demo reseller per country for the
 * "Estrella" workspace, so the dashboard map "click a country" view shows
 * several green client dots and a red reseller dot.
 *
 * Countries covered: Germany (DE), Switzerland (CH), France (FR).
 * Data is a curated subset of the pharma/chemical companies table.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-estrella-clients-resellers.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
    process.env.STORAGE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = "estrella";

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase env vars. Run with --env-file=.env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

type ClientSeed = {
    code: string;
    businessName: string;
    city: string;
    address: string;
    zipCode: number;
    countryCode: string;
    email: string;
    landlinePhone: string;
};

// Curated sample (2-3 real sites per country) from the provided companies table.
const CLIENTS: ClientSeed[] = [
    // Germany
    { code: "EST-IMP-DE-01", businessName: "BASF", city: "Ludwigshafen", address: "Carl-Bosch-Strasse 38", zipCode: 67056, countryCode: "DE", email: "info@basf.example", landlinePhone: "+49 621 600" },
    { code: "EST-IMP-DE-02", businessName: "Bayer", city: "Leverkusen", address: "Kaiser-Wilhelm-Allee 1", zipCode: 51373, countryCode: "DE", email: "info@bayer.example", landlinePhone: "+49 214 300" },
    { code: "EST-IMP-DE-03", businessName: "Merck KGaA", city: "Darmstadt", address: "Frankfurter Strasse 250", zipCode: 64293, countryCode: "DE", email: "info@merckgroup.example", landlinePhone: "+49 6151 720" },
    // Switzerland
    { code: "EST-IMP-CH-01", businessName: "Roche", city: "Basel", address: "Grenzacherstrasse 124", zipCode: 4058, countryCode: "CH", email: "info@roche.example", landlinePhone: "+41 61 688 11 11" },
    { code: "EST-IMP-CH-02", businessName: "Sulzer", city: "Winterthur", address: "Neuwiesenstrasse 15", zipCode: 8401, countryCode: "CH", email: "info@sulzer.example", landlinePhone: "+41 52 262 11 22" },
    { code: "EST-IMP-CH-03", businessName: "Givaudan", city: "Thalwil", address: "Seestrasse 1", zipCode: 8800, countryCode: "CH", email: "info@givaudan.example", landlinePhone: "+41 44 720 00 00" },
    // France
    { code: "EST-IMP-FR-01", businessName: "Sanofi", city: "Paris", address: "46 Avenue de la Grande Armee", zipCode: 75017, countryCode: "FR", email: "contact@sanofi.example", landlinePhone: "+33 1 53 77 40 00" },
    { code: "EST-IMP-FR-02", businessName: "Givaudan Fragrance", city: "Grasse", address: "Route de Cannes", zipCode: 6130, countryCode: "FR", email: "grasse@givaudan.example", landlinePhone: "+33 4 93 09 00 00" },
    { code: "EST-IMP-FR-03", businessName: "Solvay", city: "Tavaux", address: "Rue de la Chimie", zipCode: 39500, countryCode: "FR", email: "tavaux@solvay.example", landlinePhone: "+33 3 84 71 20 00" },
];

type ResellerSeed = {
    name: string;
    contact_person: string;
    country: string;
    country_code: string;
    zip_city: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    notes: string;
};

// One demo reseller per covered country (red dot on the map).
const RESELLERS: ResellerSeed[] = [
    { name: "Chemtech Vertrieb GmbH", contact_person: "Klaus Berger", country: "Deutschland", country_code: "DE", zip_city: "60311 Frankfurt am Main", address: "Zeil 90", email: "vertrieb@chemtech.example", phone: "+49 69 1234560", website: "https://chemtech.example", notes: "Rivenditore ufficiale Estrella per la Germania" },
    { name: "Estrella Partner Schweiz AG", contact_person: "Andrea Meier", country: "Schweiz", country_code: "CH", zip_city: "8005 Zuerich", address: "Hardstrasse 201", email: "kontakt@estrella-partner.example", phone: "+41 44 500 10 20", website: "https://estrella-partner.example", notes: "Rivenditore ufficiale Estrella per la Svizzera" },
    { name: "ProChimie Distribution SARL", contact_person: "Julien Moreau", country: "France", country_code: "FR", zip_city: "69002 Lyon", address: "10 Rue de la Republique", email: "contact@prochimie.example", phone: "+33 4 72 00 10 20", website: "https://prochimie.example", notes: "Rivenditore ufficiale Estrella per la Francia" },
];

async function resolveSite(): Promise<{ siteId: string; organizationId: string | null }> {
    const { data, error } = await supabase
        .from("sites")
        .select("id, organization_id")
        .eq("subdomain", SUBDOMAIN)
        .maybeSingle();

    if (error || !data) {
        throw new Error(`Sito "${SUBDOMAIN}" non trovato: ${error?.message ?? "n/a"}`);
    }
    return { siteId: data.id, organizationId: data.organization_id ?? null };
}

async function seedClients(siteId: string, organizationId: string | null) {
    let created = 0;
    let skipped = 0;

    for (const client of CLIENTS) {
        const { data: existing } = await supabase
            .from("Client")
            .select("id")
            .eq("site_id", siteId)
            .eq("code", client.code)
            .maybeSingle();

        if (existing) {
            skipped++;
            continue;
        }

        const payload: Record<string, unknown> = {
            ...client,
            clientType: "BUSINESS",
            site_id: siteId,
            contactPeople: [],
        };
        if (organizationId) payload.organization_id = organizationId;

        const { error } = await supabase.from("Client").insert(payload);
        if (error) {
            throw new Error(`Client ${client.code}: ${error.message}`);
        }
        created++;
    }

    console.log(`✓ Clienti: ${created} creati, ${skipped} già presenti`);
}

async function seedResellers(siteId: string) {
    let created = 0;
    let skipped = 0;

    for (const reseller of RESELLERS) {
        const { data: existing } = await supabase
            .from("Reseller")
            .select("id")
            .eq("site_id", siteId)
            .eq("name", reseller.name)
            .maybeSingle();

        if (existing) {
            skipped++;
            continue;
        }

        const { error } = await supabase
            .from("Reseller")
            .insert({ ...reseller, site_id: siteId });
        if (error) {
            throw new Error(`Reseller ${reseller.name}: ${error.message}`);
        }
        created++;
    }

    console.log(`✓ Rivenditori: ${created} creati, ${skipped} già presenti`);
}

async function main() {
    console.log("🌍 Seed clienti + rivenditori Estrella (DE / CH / FR)\n");
    const { siteId, organizationId } = await resolveSite();
    await seedClients(siteId, organizationId);
    await seedResellers(siteId);
    console.log(`\n✅ Fatto. Site ID: ${siteId}`);
}

main().catch((err) => {
    console.error("\n❌ Seed fallito:", err);
    process.exit(1);
});
