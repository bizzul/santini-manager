/**
 * Seed workspace "Scherman" (costruzioni in legno).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-scherman.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = "scherman";
const ORG_NAME = "Scherman Costruzioni";
const SITE_NAME = "Scherman";
const SITE_DESCRIPTION = "Costruzioni in legno";

const LOGO_PATH = join(
    process.cwd(),
    "../.cursor/projects/Users-matteopaolocci-santini-manager/assets/Progetto_Sherman_Costruzioni-8bb6b95f-27f8-4fe6-9ea7-b5ae7452eb8c.png",
);

const AVATAR_PALETTE = [
    "#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#f43f5e",
    "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e",
    "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
];

const KANBAN_CATEGORIES = [
    { name: "Vendita", identifier: "ufficio", color: "#F59E0B", icon: "BadgeDollarSign", display_order: 0, is_internal: false, internal_base_code: null as number | null },
    { name: "Ufficio tecnico", identifier: "ufficio-tecnico", color: "#6B7280", icon: "Mouse", display_order: 1, is_internal: false, internal_base_code: null },
    { name: "Produzione", identifier: "produzione", color: "#EC4899", icon: "Factory", display_order: 2, is_internal: false, internal_base_code: null },
    { name: "Service", identifier: "service", color: "#3B82F6", icon: "Drill", display_order: 3, is_internal: true, internal_base_code: 7000 },
    { name: "Fatturazione", identifier: "fatturazione", color: "#10B981", icon: "ArrowRightFromLine", display_order: 4, is_internal: false, internal_base_code: null },
    { name: "Interni", identifier: "interni", color: "#3B82F6", icon: "Home", display_order: 5, is_internal: true, internal_base_code: 1000 },
];

type KanbanDef = {
    title: string;
    identifier: string;
    categoryIdentifier: string;
    color: string;
    icon: string;
    is_offer_kanban?: boolean;
    is_work_kanban?: boolean;
    is_production_kanban?: boolean;
    show_category_colors?: boolean;
    columns: Array<{
        title: string;
        identifier: string;
        position: number;
        column_type: string;
        is_creation_column: boolean;
    }>;
};

const KANBAN_BOARDS: KanbanDef[] = [
    {
        title: "Offerte",
        identifier: "0_offerte",
        categoryIdentifier: "ufficio",
        color: "#f0900a",
        icon: "Activity",
        is_offer_kanban: true,
        columns: [
            { title: "To do", identifier: "to_do_0_offerte", position: 1, column_type: "normal", is_creation_column: false },
            { title: "Elaborazione", identifier: "elaborazione_0_offerte", position: 2, column_type: "normal", is_creation_column: true },
            { title: "Inviata", identifier: "inviata_0_offerte", position: 3, column_type: "normal", is_creation_column: false },
            { title: "Trattativa", identifier: "trattativa_0_offerte", position: 4, column_type: "normal", is_creation_column: false },
            { title: "Vinta", identifier: "vinta_0_offerte", position: 5, column_type: "won", is_creation_column: false },
            { title: "Persa", identifier: "persa_0_offerte", position: 6, column_type: "lost", is_creation_column: false },
        ],
    },
    {
        title: "AVOR",
        identifier: "1_avor",
        categoryIdentifier: "ufficio-tecnico",
        color: "#1c4fa0",
        icon: "FileText",
        is_work_kanban: true,
        show_category_colors: true,
        columns: [
            { title: "To Do", identifier: "to_do_1_avor", position: 1, column_type: "normal", is_creation_column: true },
            { title: "Rilievo", identifier: "rilievo_1_avor", position: 2, column_type: "normal", is_creation_column: false },
            { title: "Elaborazione", identifier: "elaborazione_1_avor", position: 3, column_type: "normal", is_creation_column: false },
            { title: "Produzione", identifier: "produzione_1_avor", position: 4, column_type: "production", is_creation_column: false },
        ],
    },
    {
        title: "1. Arredamento",
        identifier: "arredamento",
        categoryIdentifier: "produzione",
        color: "#3516a7",
        icon: "Armchair",
        is_production_kanban: true,
        columns: [
            { title: "To Do", identifier: "to_do_arredamento", position: 1, column_type: "normal", is_creation_column: true },
            { title: "Taglio", identifier: "taglio_arredamento", position: 2, column_type: "normal", is_creation_column: false },
            { title: "CNC", identifier: "cnc_arredamento", position: 3, column_type: "normal", is_creation_column: false },
            { title: "Prep.", identifier: "prep_arredamento", position: 4, column_type: "normal", is_creation_column: false },
            { title: "Finitura", identifier: "finitura_arredamento", position: 5, column_type: "normal", is_creation_column: false },
            { title: "Montaggio", identifier: "montaggio_arredamento", position: 6, column_type: "normal", is_creation_column: false },
            { title: "Qualità", identifier: "qualit_arredamento", position: 7, column_type: "normal", is_creation_column: false },
            { title: "Spedito", identifier: "spedito_arredamento", position: 8, column_type: "invoicing", is_creation_column: false },
        ],
    },
    {
        title: "2. Porte",
        identifier: "porte",
        categoryIdentifier: "produzione",
        color: "#ff8647",
        icon: "KeyRound",
        is_production_kanban: true,
        columns: [
            { title: "To do", identifier: "to_do_porte", position: 1, column_type: "normal", is_creation_column: true },
            { title: "CNC", identifier: "cnc_porte", position: 2, column_type: "normal", is_creation_column: false },
            { title: "Prep.", identifier: "prep_porte", position: 3, column_type: "normal", is_creation_column: false },
            { title: "Finitura", identifier: "finitura_porte", position: 4, column_type: "normal", is_creation_column: false },
            { title: "Montaggio", identifier: "montaggio_porte", position: 5, column_type: "normal", is_creation_column: false },
            { title: "Qualità", identifier: "qualit_porte", position: 6, column_type: "normal", is_creation_column: false },
            { title: "Spedito", identifier: "spedito_porte", position: 7, column_type: "invoicing", is_creation_column: false },
        ],
    },
    {
        title: "3. Serramenti",
        identifier: "serramenti",
        categoryIdentifier: "produzione",
        color: "#fffc41",
        icon: "Building",
        is_production_kanban: true,
        columns: [
            { title: "To do", identifier: "to_do_serramenti", position: 1, column_type: "normal", is_creation_column: true },
            { title: "CNC", identifier: "cnc_serramenti", position: 2, column_type: "normal", is_creation_column: false },
            { title: "Prep.", identifier: "prep_serramenti", position: 3, column_type: "normal", is_creation_column: false },
            { title: "Finitura", identifier: "finitura_serramenti", position: 4, column_type: "normal", is_creation_column: false },
            { title: "Montaggio", identifier: "montaggio_serramenti", position: 5, column_type: "normal", is_creation_column: false },
            { title: "Qualità", identifier: "qualit_serramenti", position: 6, column_type: "normal", is_creation_column: false },
            { title: "Spedito", identifier: "spedizo_serramenti", position: 7, column_type: "invoicing", is_creation_column: false },
        ],
    },
    {
        title: "4. Accessori",
        identifier: "5_accessori",
        categoryIdentifier: "produzione",
        color: "#a03784",
        icon: "List",
        is_production_kanban: true,
        columns: [
            { title: "To Do", identifier: "to_do_5_accessori", position: 1, column_type: "normal", is_creation_column: true },
            { title: "Elaborazione", identifier: "elaborazione_5_accessori", position: 2, column_type: "normal", is_creation_column: false },
            { title: "Ultimato", identifier: "ultimato_5_accessori", position: 3, column_type: "invoicing", is_creation_column: false },
        ],
    },
    {
        title: "5. Posa",
        identifier: "5_posa",
        categoryIdentifier: "produzione",
        color: "#8f9aae",
        icon: "Drill",
        is_production_kanban: true,
        show_category_colors: true,
        columns: [
            { title: "To Do", identifier: "to_do_5_posa", position: 1, column_type: "normal", is_creation_column: true },
            { title: "Pian", identifier: "pian_5_posa", position: 2, column_type: "normal", is_creation_column: false },
            { title: "Esecuzione", identifier: "esecuzione_5_posa", position: 3, column_type: "normal", is_creation_column: false },
            { title: "Collaudo", identifier: "collaudo_5_posa", position: 4, column_type: "invoicing", is_creation_column: false },
        ],
    },
    {
        title: "Service",
        identifier: "service",
        categoryIdentifier: "service",
        color: "#e14705",
        icon: "Settings",
        columns: [
            { title: "To Do", identifier: "to_do_service", position: 1, column_type: "normal", is_creation_column: true },
            { title: "Pianificato", identifier: "pianificato_service", position: 2, column_type: "normal", is_creation_column: false },
            { title: "Esecuzione", identifier: "esecuzione_service", position: 3, column_type: "normal", is_creation_column: false },
            { title: "Ultimato", identifier: "ultimato_service", position: 4, column_type: "normal", is_creation_column: false },
        ],
    },
    {
        title: "Fatture OUT",
        identifier: "fatture",
        categoryIdentifier: "fatturazione",
        color: "#3f434b",
        icon: "MailCheck",
        columns: [
            { title: "To Do", identifier: "to_do_fatture", position: 1, column_type: "normal", is_creation_column: true },
            { title: "Inviata", identifier: "inviata_fatture", position: 2, column_type: "normal", is_creation_column: false },
            { title: "Pagata", identifier: "pagata_fatture", position: 3, column_type: "normal", is_creation_column: false },
        ],
    },
    {
        title: "Diversi",
        identifier: "diversi",
        categoryIdentifier: "interni",
        color: "#d7be65",
        icon: "Network",
        columns: [
            { title: "To Do", identifier: "to_do_diversi", position: 1, column_type: "normal", is_creation_column: true },
            { title: "Progettazione", identifier: "progettazione_diversi", position: 2, column_type: "normal", is_creation_column: false },
            { title: "Esecizione", identifier: "esecizione_diversi", position: 3, column_type: "normal", is_creation_column: false },
            { title: "Ultimato", identifier: "ultimato_diversi", position: 4, column_type: "normal", is_creation_column: false },
        ],
    },
    {
        title: "R&D",
        identifier: "9_rd",
        categoryIdentifier: "interni",
        color: "#7195d1",
        icon: "Rocket",
        columns: [
            { title: "To Do", identifier: "to_do_9_rd", position: 1, column_type: "normal", is_creation_column: true },
            { title: "Progettazione", identifier: "progettazione_9_rd", position: 2, column_type: "normal", is_creation_column: false },
            { title: "Prototipo", identifier: "prototipo_9_rd", position: 3, column_type: "normal", is_creation_column: false },
            { title: "Collaudo", identifier: "collaudo_9_rd", position: 4, column_type: "normal", is_creation_column: false },
            { title: "Ultimato", identifier: "ultimato_9_rd", position: 5, column_type: "normal", is_creation_column: false },
        ],
    },
    {
        title: "Spazi",
        identifier: "10_spazi",
        categoryIdentifier: "interni",
        color: "#5186db",
        icon: "Factory",
        columns: [
            { title: "To Do", identifier: "to_do_10_spazi", position: 1, column_type: "normal", is_creation_column: true },
            { title: "Progettazione", identifier: "progettazione_10_spazi", position: 2, column_type: "normal", is_creation_column: false },
            { title: "Esecuzione", identifier: "esecuzione_10_spazi", position: 3, column_type: "normal", is_creation_column: false },
            { title: "Ultimato", identifier: "ultimato_10_spazi", position: 4, column_type: "normal", is_creation_column: false },
        ],
    },
];

const DRAFT_USERS = [
    { given_name: "Marco", family_name: "Renzini", email: "marco.renzini@scherman.local", company_role: "Titolare" },
    { given_name: "Lorenzo", family_name: "Pagnottoni", email: "lorenzo.pagnottoni@scherman.local", company_role: "Responsabile produzione" },
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

/** KanbanColumn.identifier is globally UNIQUE in DB — scope per sito. */
function scopedColumnIdentifier(base: string): string {
    return `${SUBDOMAIN}_${base}`;
}

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase env vars. Run with --env-file=.env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function ensureOrganizationAndSite() {
    const { data: existingSite } = await supabase
        .from("sites")
        .select("id, organization_id, logo")
        .eq("subdomain", SUBDOMAIN)
        .maybeSingle();

    if (existingSite) {
        console.log(`↷ Sito "${SUBDOMAIN}" già presente (${existingSite.id})`);
        return { siteId: existingSite.id, organizationId: existingSite.organization_id as string, logoUrl: existingSite.logo };
    }

    const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .insert({ name: ORG_NAME })
        .select("id")
        .single();

    if (orgError || !organization) {
        throw new Error(`organizations: ${orgError?.message}`);
    }

    const { data: site, error: siteError } = await supabase
        .from("sites")
        .insert({
            organization_id: organization.id,
            name: SITE_NAME,
            description: SITE_DESCRIPTION,
            subdomain: SUBDOMAIN,
        })
        .select("id, organization_id")
        .single();

    if (siteError || !site) {
        throw new Error(`sites: ${siteError?.message}`);
    }

    console.log(`✓ Organizzazione e sito creati (${organization.id} / ${site.id})`);
    return { siteId: site.id, organizationId: organization.id, logoUrl: null as string | null };
}

async function uploadLogo(siteId: string, currentLogo: string | null) {
    if (currentLogo) {
        console.log(`↷ Logo già presente: ${currentLogo}`);
        return currentLogo;
    }

    let logoBuffer: Buffer;
    try {
        logoBuffer = readFileSync(LOGO_PATH);
    } catch {
        throw new Error(`Logo non trovato in ${LOGO_PATH}`);
    }

    const fileName = `${siteId}/logo.png`;
    const { error: uploadError } = await supabase.storage
        .from("site-logos")
        .upload(fileName, logoBuffer, {
            contentType: "image/png",
            cacheControl: "3600",
            upsert: true,
        });

    if (uploadError) {
        throw new Error(`Logo upload: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage.from("site-logos").getPublicUrl(fileName);

    const { error: updateError } = await supabase
        .from("sites")
        .update({ logo: publicUrl })
        .eq("id", siteId);

    if (updateError) {
        throw new Error(`Logo update: ${updateError.message}`);
    }

    console.log(`✓ Logo caricato: ${publicUrl}`);
    return publicUrl;
}

async function ensureKanbanStructure(siteId: string) {
    const categoryIdByIdentifier = new Map<string, number>();

    for (const cat of KANBAN_CATEGORIES) {
        const { data: existing } = await supabase
            .from("KanbanCategory")
            .select("id")
            .eq("site_id", siteId)
            .eq("identifier", cat.identifier)
            .maybeSingle();

        if (existing) {
            categoryIdByIdentifier.set(cat.identifier, existing.id);
            continue;
        }

        const { data: created, error } = await supabase
            .from("KanbanCategory")
            .insert({ ...cat, site_id: siteId })
            .select("id")
            .single();

        if (error || !created) {
            throw new Error(`KanbanCategory ${cat.identifier}: ${error?.message}`);
        }

        categoryIdByIdentifier.set(cat.identifier, created.id);
    }

    console.log(`✓ ${categoryIdByIdentifier.size} categorie kanban`);

    const kanbanIdByIdentifier = new Map<string, number>();

    for (const board of KANBAN_BOARDS) {
        const categoryId = categoryIdByIdentifier.get(board.categoryIdentifier);
        if (!categoryId) {
            throw new Error(`Categoria mancante: ${board.categoryIdentifier}`);
        }

        const { data: existing } = await supabase
            .from("Kanban")
            .select("id")
            .eq("site_id", siteId)
            .eq("identifier", board.identifier)
            .maybeSingle();

        let kanbanId: number;

        if (existing) {
            kanbanId = existing.id;
        } else {
            const { data: created, error } = await supabase
                .from("Kanban")
                .insert({
                    title: board.title,
                    identifier: board.identifier,
                    site_id: siteId,
                    category_id: categoryId,
                    color: board.color,
                    icon: board.icon,
                    is_offer_kanban: board.is_offer_kanban ?? false,
                    is_work_kanban: board.is_work_kanban ?? false,
                    is_production_kanban: board.is_production_kanban ?? false,
                    show_category_colors: board.show_category_colors ?? false,
                })
                .select("id")
                .single();

            if (error || !created) {
                throw new Error(`Kanban ${board.identifier}: ${error?.message}`);
            }

            kanbanId = created.id;
        }

        kanbanIdByIdentifier.set(board.identifier, kanbanId);

        for (const col of board.columns) {
            const identifier = scopedColumnIdentifier(col.identifier);

            const { data: existingCol } = await supabase
                .from("KanbanColumn")
                .select("id")
                .eq("kanbanId", kanbanId)
                .eq("identifier", identifier)
                .maybeSingle();

            if (existingCol) continue;

            const { error: colError } = await supabase.from("KanbanColumn").insert({
                ...col,
                identifier,
                kanbanId,
            });

            if (colError) {
                throw new Error(`KanbanColumn ${identifier}: ${colError.message}`);
            }
        }
    }

    const offerKanbanId = kanbanIdByIdentifier.get("0_offerte");
    const workKanbanId = kanbanIdByIdentifier.get("1_avor");
    if (offerKanbanId && workKanbanId) {
        await supabase
            .from("Kanban")
            .update({ target_work_kanban_id: workKanbanId })
            .eq("id", offerKanbanId);
    }

    console.log(`✓ ${kanbanIdByIdentifier.size} kanban con colonne`);
    return kanbanIdByIdentifier;
}

async function ensureSiteMembership(authId: string, siteId: string, organizationId: string) {
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

async function ensureDraftUsers(siteId: string, organizationId: string) {
    for (const person of DRAFT_USERS) {
        const { data: existing } = await supabase
            .from("User")
            .select("authId")
            .eq("email", person.email)
            .maybeSingle();

        if (existing?.authId) {
            await ensureSiteMembership(existing.authId, siteId, organizationId);
            console.log(`↷ ${person.given_name} ${person.family_name} — già presente`);
            continue;
        }

        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
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
            initials: initials(person.given_name, person.family_name),
            color,
            role: "user",
            enabled: false,
            activation_status: "draft",
        });

        if (profileError) {
            throw new Error(`User ${person.email}: ${profileError.message}`);
        }

        await ensureSiteMembership(userId, siteId, organizationId);
        console.log(`✓ ${person.given_name} ${person.family_name} — bozza creata`);
    }
}

async function ensureDemoClients(siteId: string, organizationId: string) {
    const clients = [
        {
            code: "SCH-001",
            clientType: "BUSINESS",
            businessName: "Alpine Chalet AG",
            email: "info@alpinechalet.ch",
            city: "Davos",
            address: "Promenade 12",
            zipCode: 7270,
            countryCode: "CH",
            mobilePhone: "+41 81 123 45 67",
        },
        {
            code: "SCH-002",
            clientType: "INDIVIDUAL",
            individualTitle: "Sig.",
            individualFirstName: "Luca",
            individualLastName: "Bianchi",
            email: "luca.bianchi@email.ch",
            city: "Lugano",
            address: "Via Nassa 8",
            zipCode: 6900,
            countryCode: "CH",
            mobilePhone: "+41 79 234 56 78",
        },
        {
            code: "SCH-003",
            clientType: "BUSINESS",
            businessName: "Hotel Bellavista SA",
            email: "progetti@bellavista.ch",
            city: "Ascona",
            address: "Viale Monte Verità 3",
            zipCode: 6612,
            countryCode: "CH",
            landlinePhone: "+41 91 765 43 21",
        },
        {
            code: "SCH-004",
            clientType: "BUSINESS",
            businessName: "Architetto Studio Verde",
            email: "studio@verde-arch.ch",
            city: "Locarno",
            address: "Piazza Grande 5",
            zipCode: 6600,
            countryCode: "CH",
        },
        {
            code: "SCH-005",
            clientType: "INDIVIDUAL",
            individualTitle: "Sig.ra",
            individualFirstName: "Elena",
            individualLastName: "Fontana",
            email: "elena.fontana@email.ch",
            city: "Bellinzona",
            address: "Via Orico 22",
            zipCode: 6500,
            countryCode: "CH",
        },
        {
            code: "SCH-006",
            clientType: "BUSINESS",
            businessName: "Rifugio Alpino SA",
            email: "info@rifugioalpino.ch",
            city: "Airolo",
            address: "Via Sasso 4",
            zipCode: 6780,
            countryCode: "CH",
            landlinePhone: "+41 91 869 12 34",
        },
        {
            code: "SCH-007",
            clientType: "INDIVIDUAL",
            individualTitle: "Sig.",
            individualFirstName: "Giuseppe",
            individualLastName: "Conti",
            email: "giuseppe.conti@email.ch",
            city: "Mendrisio",
            address: "Via Maggiore 18",
            zipCode: 6850,
            countryCode: "CH",
            mobilePhone: "+41 79 345 67 89",
        },
        {
            code: "SCH-008",
            clientType: "BUSINESS",
            businessName: "Villa Moderna Sagl",
            email: "progetti@villamoderna.ch",
            city: "Chiasso",
            address: "Via Dante 7",
            zipCode: 6830,
            countryCode: "CH",
        },
        {
            code: "SCH-009",
            clientType: "BUSINESS",
            businessName: "Cooperativa Abitazioni Ticino",
            email: "amministrazione@coopabit.ch",
            city: "Bellinzona",
            address: "Via Olimpia 2",
            zipCode: 6500,
            countryCode: "CH",
            landlinePhone: "+41 91 825 11 00",
        },
        {
            code: "SCH-010",
            clientType: "INDIVIDUAL",
            individualTitle: "Sig.ra",
            individualFirstName: "Anna",
            individualLastName: "Rossi",
            email: "anna.rossi@email.ch",
            city: "Locarno",
            address: "Via della Pace 14",
            zipCode: 6600,
            countryCode: "CH",
            mobilePhone: "+41 78 456 78 90",
        },
    ];

    const clientIds: number[] = [];

    for (const client of clients) {
        const { data: existing } = await supabase
            .from("Client")
            .select("id")
            .eq("site_id", siteId)
            .eq("code", client.code)
            .maybeSingle();

        if (existing) {
            clientIds.push(existing.id);
            continue;
        }

        const { data: created, error } = await supabase
            .from("Client")
            .insert({ ...client, site_id: siteId, organization_id: organizationId, contactPeople: [] })
            .select("id")
            .single();

        if (error || !created) {
            throw new Error(`Client ${client.code}: ${error?.message}`);
        }

        clientIds.push(created.id);
    }

    console.log(`✓ ${clientIds.length} clienti demo`);
    return clientIds;
}

async function ensureDemoProducts(siteId: string) {
    const categories = [
        { name: "Serramenti", color: "#3B82F6" },
        { name: "Porte", color: "#F97316" },
        { name: "Arredamento", color: "#8B5CF6" },
        { name: "Scale", color: "#14B8A6" },
        { name: "Strutture in legno", color: "#84CC16" },
    ];

    const categoryIdByName = new Map<string, number>();

    for (const cat of categories) {
        const { data: existing } = await supabase
            .from("sellproduct_categories")
            .select("id")
            .eq("site_id", siteId)
            .eq("name", cat.name)
            .maybeSingle();

        if (existing) {
            categoryIdByName.set(cat.name, existing.id);
            continue;
        }

        const { data: created, error } = await supabase
            .from("sellproduct_categories")
            .insert({ site_id: siteId, name: cat.name, color: cat.color })
            .select("id")
            .single();

        if (error || !created) {
            throw new Error(`sellproduct_categories ${cat.name}: ${error?.message}`);
        }

        categoryIdByName.set(cat.name, created.id);
    }

    const products = [
        { name: "Finestra in larice 120x140", type: "Finestre", category: "Serramenti", description: "Listino CHF 1'850", internal_code: "SER-FIN-120" },
        { name: "Porta interna rovere 90x210", type: "Porte interne", category: "Porte", description: "Listino CHF 980", internal_code: "POR-INT-90" },
        { name: "Porta blindata legno 90x210", type: "Porte blindate", category: "Porte", description: "Listino CHF 4'200", internal_code: "POR-BLI-90" },
        { name: "Cucina su misura rovere", type: "Cucine", category: "Arredamento", description: "Listino CHF 3'200/ml", internal_code: "ARR-CUC-ROV" },
        { name: "Armadio su misura", type: "Armadi", category: "Arredamento", description: "Listino CHF 2'800/ml", internal_code: "ARR-ARM-SM" },
        { name: "Scala in legno massello", type: "Scale", category: "Scale", description: "Listino CHF 12'500", internal_code: "SCA-MAS-01" },
        { name: "Tettoia in legno lamellare", type: "Tettoie", category: "Strutture in legno", description: "Listino CHF 450/mq", internal_code: "STR-TET-LAM" },
        { name: "Pergola bioclimatica legno", type: "Pergole", category: "Strutture in legno", description: "Listino CHF 680/mq", internal_code: "STR-PER-BIO" },
        { name: "Finestra scorrevole 240x220", type: "Finestre", category: "Serramenti", description: "Listino CHF 3'400", internal_code: "SER-SCO-240" },
        { name: "Porta-finestra 140x220", type: "Porte-finestre", category: "Serramenti", description: "Listino CHF 2'650", internal_code: "SER-PF-140" },
    ];

    let createdCount = 0;

    for (const product of products) {
        const { data: existing } = await supabase
            .from("SellProduct")
            .select("id")
            .eq("site_id", siteId)
            .eq("internal_code", product.internal_code)
            .maybeSingle();

        if (existing) continue;

        const categoryId = categoryIdByName.get(product.category);
        const { error } = await supabase.from("SellProduct").insert({
            site_id: siteId,
            name: product.name,
            type: product.type,
            description: product.description,
            category_id: categoryId,
            internal_code: product.internal_code,
            active: true,
            price_list: true,
        });

        if (error) {
            throw new Error(`SellProduct ${product.internal_code}: ${error.message}`);
        }

        createdCount++;
    }

    console.log(`✓ ${categories.length} categorie prodotti, ${products.length} prodotti catalogo (${createdCount} nuovi)`);
}

async function getColumnId(kanbanId: number, baseIdentifier: string): Promise<number | null> {
    const identifier = scopedColumnIdentifier(baseIdentifier);
    const { data } = await supabase
        .from("KanbanColumn")
        .select("id")
        .eq("kanbanId", kanbanId)
        .eq("identifier", identifier)
        .maybeSingle();

    return data?.id ?? null;
}

async function ensureDemoTasks(
    siteId: string,
    clientIds: number[],
    kanbanIdByIdentifier: Map<string, number>,
) {
    const offerKanbanId = kanbanIdByIdentifier.get("0_offerte")!;
    const avorKanbanId = kanbanIdByIdentifier.get("1_avor")!;
    const arredamentoKanbanId = kanbanIdByIdentifier.get("arredamento")!;
    const porteKanbanId = kanbanIdByIdentifier.get("porte")!;
    const serramentiKanbanId = kanbanIdByIdentifier.get("serramenti")!;
    const accessoriKanbanId = kanbanIdByIdentifier.get("5_accessori")!;
    const posaKanbanId = kanbanIdByIdentifier.get("5_posa")!;
    const serviceKanbanId = kanbanIdByIdentifier.get("service")!;

    if (!offerKanbanId || !avorKanbanId || !arredamentoKanbanId) {
        throw new Error("Kanban demo mancanti");
    }

    const col = async (kanbanId: number, base: string) => {
        const id = await getColumnId(kanbanId, base);
        if (!id) throw new Error(`Colonna mancante: ${base}`);
        return id;
    };

    const [
        offerTodoCol, offerElabCol, offerInviataCol, offerTrattCol, offerVintaCol,
        avorTodoCol, avorRilievoCol, avorElabCol, avorProdCol,
        arrTodoCol, arrTaglioCol, arrPrepCol, arrFinituraCol, arrMontaggioCol,
        porteCncCol, porteTodoCol,
        serrPrepCol, serrFinituraCol,
        accElabCol,
        posaEsecCol, posaTodoCol,
        servicePianCol,
    ] = await Promise.all([
        col(offerKanbanId, "to_do_0_offerte"),
        col(offerKanbanId, "elaborazione_0_offerte"),
        col(offerKanbanId, "inviata_0_offerte"),
        col(offerKanbanId, "trattativa_0_offerte"),
        col(offerKanbanId, "vinta_0_offerte"),
        col(avorKanbanId, "to_do_1_avor"),
        col(avorKanbanId, "rilievo_1_avor"),
        col(avorKanbanId, "elaborazione_1_avor"),
        col(avorKanbanId, "produzione_1_avor"),
        col(arredamentoKanbanId, "to_do_arredamento"),
        col(arredamentoKanbanId, "taglio_arredamento"),
        col(arredamentoKanbanId, "prep_arredamento"),
        col(arredamentoKanbanId, "finitura_arredamento"),
        col(arredamentoKanbanId, "montaggio_arredamento"),
        col(porteKanbanId, "cnc_porte"),
        col(porteKanbanId, "to_do_porte"),
        col(serramentiKanbanId, "prep_serramenti"),
        col(serramentiKanbanId, "finitura_serramenti"),
        col(accessoriKanbanId, "elaborazione_5_accessori"),
        col(posaKanbanId, "esecuzione_5_posa"),
        col(posaKanbanId, "to_do_5_posa"),
        col(serviceKanbanId, "pianificato_service"),
    ]);

    const tasks = [
        {
            unique_code: "OFF-2026-001",
            title: "Ristrutturazione chalet Davos",
            name: "Ristrutturazione chalet Davos",
            task_type: "OFFERTA",
            clientId: clientIds[0],
            kanbanId: offerKanbanId,
            kanbanColumnId: offerTrattCol,
            column_id: offerTrattCol,
            column_position: 1,
            sellPrice: 85000,
            legno: true,
        },
        {
            unique_code: "OFF-2026-002",
            title: "Cucina su misura Hotel Bellavista",
            name: "Cucina su misura Hotel Bellavista",
            task_type: "OFFERTA",
            clientId: clientIds[2],
            kanbanId: offerKanbanId,
            kanbanColumnId: offerElabCol,
            column_id: offerElabCol,
            column_position: 1,
            sellPrice: 42000,
            legno: true,
        },
        {
            unique_code: "OFF-2026-003",
            title: "Pergola bioclimatica Locarno",
            name: "Pergola bioclimatica Locarno",
            task_type: "OFFERTA",
            clientId: clientIds[3],
            kanbanId: offerKanbanId,
            kanbanColumnId: offerTrattCol,
            column_id: offerTrattCol,
            column_position: 2,
            sellPrice: 28500,
            legno: true,
        },
        {
            unique_code: "OFF-2026-004",
            title: "Serramenti rifugio montano Airolo",
            name: "Serramenti rifugio montano Airolo",
            task_type: "OFFERTA",
            clientId: clientIds[5],
            kanbanId: offerKanbanId,
            kanbanColumnId: offerInviataCol,
            column_id: offerInviataCol,
            column_position: 1,
            sellPrice: 52000,
            legno: true,
        },
        {
            unique_code: "OFF-2026-005",
            title: "Scala in massello villa Chiasso",
            name: "Scala in massello villa Chiasso",
            task_type: "OFFERTA",
            clientId: clientIds[7],
            kanbanId: offerKanbanId,
            kanbanColumnId: offerElabCol,
            column_id: offerElabCol,
            column_position: 2,
            sellPrice: 15800,
            legno: true,
        },
        {
            unique_code: "OFF-2026-006",
            title: "Tettoia lamellare Mendrisio",
            name: "Tettoia lamellare Mendrisio",
            task_type: "OFFERTA",
            clientId: clientIds[6],
            kanbanId: offerKanbanId,
            kanbanColumnId: offerTodoCol,
            column_id: offerTodoCol,
            column_position: 1,
            sellPrice: 12400,
            legno: true,
        },
        {
            unique_code: "OFF-2026-007",
            title: "Ristrutturazione facciata condominio",
            name: "Ristrutturazione facciata condominio",
            task_type: "OFFERTA",
            clientId: clientIds[8],
            kanbanId: offerKanbanId,
            kanbanColumnId: offerVintaCol,
            column_id: offerVintaCol,
            column_position: 1,
            sellPrice: 96000,
            legno: true,
        },
        {
            unique_code: "AVO-2026-001",
            title: "Progetto AVOR chalet Davos",
            name: "Progetto AVOR chalet Davos",
            task_type: "LAVORO",
            clientId: clientIds[0],
            kanbanId: avorKanbanId,
            kanbanColumnId: avorRilievoCol,
            column_id: avorRilievoCol,
            column_position: 1,
            sellPrice: 85000,
            legno: true,
            material: true,
        },
        {
            unique_code: "AVO-2026-002",
            title: "AVOR pergola Studio Verde",
            name: "AVOR pergola Studio Verde",
            task_type: "LAVORO",
            clientId: clientIds[3],
            kanbanId: avorKanbanId,
            kanbanColumnId: avorElabCol,
            column_id: avorElabCol,
            column_position: 1,
            sellPrice: 28500,
            legno: true,
            material: true,
        },
        {
            unique_code: "AVO-2026-003",
            title: "AVOR serramenti rifugio Airolo",
            name: "AVOR serramenti rifugio Airolo",
            task_type: "LAVORO",
            clientId: clientIds[5],
            kanbanId: avorKanbanId,
            kanbanColumnId: avorProdCol,
            column_id: avorProdCol,
            column_position: 1,
            sellPrice: 52000,
            legno: true,
            material: true,
        },
        {
            unique_code: "PRO-2026-001",
            title: "Armadi suite hotel - produzione",
            name: "Armadi suite hotel - produzione",
            task_type: "LAVORO",
            clientId: clientIds[2],
            kanbanId: arredamentoKanbanId,
            kanbanColumnId: arrTaglioCol,
            column_id: arrTaglioCol,
            column_position: 1,
            sellPrice: 18500,
            legno: true,
            material: true,
        },
        {
            unique_code: "PRO-2026-002",
            title: "Porte interne villa Lugano",
            name: "Porte interne villa Lugano",
            task_type: "LAVORO",
            clientId: clientIds[1],
            kanbanId: arredamentoKanbanId,
            kanbanColumnId: arrTodoCol,
            column_id: arrTodoCol,
            column_position: 1,
            sellPrice: 9800,
            legno: true,
        },
        {
            unique_code: "PRO-2026-003",
            title: "Libreria su misura studio architetto",
            name: "Libreria su misura studio architetto",
            task_type: "LAVORO",
            clientId: clientIds[3],
            kanbanId: arredamentoKanbanId,
            kanbanColumnId: arrPrepCol,
            column_id: arrPrepCol,
            column_position: 1,
            sellPrice: 7200,
            legno: true,
            material: true,
        },
        {
            unique_code: "PRO-2026-004",
            title: "Bancone reception hotel",
            name: "Bancone reception hotel",
            task_type: "LAVORO",
            clientId: clientIds[2],
            kanbanId: arredamentoKanbanId,
            kanbanColumnId: arrMontaggioCol,
            column_id: arrMontaggioCol,
            column_position: 1,
            sellPrice: 11400,
            legno: true,
            material: true,
        },
        {
            unique_code: "PRO-2026-005",
            title: "Porte blindate uffici Chiasso",
            name: "Porte blindate uffici Chiasso",
            task_type: "LAVORO",
            clientId: clientIds[7],
            kanbanId: porteKanbanId,
            kanbanColumnId: porteCncCol,
            column_id: porteCncCol,
            column_position: 1,
            sellPrice: 16800,
            legno: true,
            material: true,
        },
        {
            unique_code: "PRO-2026-006",
            title: "Finestre larice facciata sud",
            name: "Finestre larice facciata sud",
            task_type: "LAVORO",
            clientId: clientIds[5],
            kanbanId: serramentiKanbanId,
            kanbanColumnId: serrPrepCol,
            column_id: serrPrepCol,
            column_position: 1,
            sellPrice: 34200,
            legno: true,
            material: true,
        },
        {
            unique_code: "PRO-2026-007",
            title: "Accessori suite premium",
            name: "Accessori suite premium",
            task_type: "LAVORO",
            clientId: clientIds[2],
            kanbanId: accessoriKanbanId,
            kanbanColumnId: accElabCol,
            column_id: accElabCol,
            column_position: 1,
            sellPrice: 4800,
            legno: false,
            ferramenta: true,
        },
        {
            unique_code: "PRO-2026-008",
            title: "Posa serramenti chalet Davos",
            name: "Posa serramenti chalet Davos",
            task_type: "LAVORO",
            clientId: clientIds[0],
            kanbanId: posaKanbanId,
            kanbanColumnId: posaEsecCol,
            column_id: posaEsecCol,
            column_position: 1,
            sellPrice: 8600,
            legno: true,
        },
        {
            unique_code: "PRO-2026-009",
            title: "Cucina open space Bellinzona",
            name: "Cucina open space Bellinzona",
            task_type: "LAVORO",
            clientId: clientIds[9],
            kanbanId: arredamentoKanbanId,
            kanbanColumnId: arrFinituraCol,
            column_id: arrFinituraCol,
            column_position: 1,
            sellPrice: 31500,
            legno: true,
            material: true,
        },
        {
            unique_code: "PRO-2026-010",
            title: "Porte interne appartamento Mendrisio",
            name: "Porte interne appartamento Mendrisio",
            task_type: "LAVORO",
            clientId: clientIds[6],
            kanbanId: porteKanbanId,
            kanbanColumnId: porteTodoCol,
            column_id: porteTodoCol,
            column_position: 1,
            sellPrice: 6400,
            legno: true,
        },
        {
            unique_code: "PRO-2026-011",
            title: "Serramenti condominio Bellinzona",
            name: "Serramenti condominio Bellinzona",
            task_type: "LAVORO",
            clientId: clientIds[8],
            kanbanId: serramentiKanbanId,
            kanbanColumnId: serrFinituraCol,
            column_id: serrFinituraCol,
            column_position: 1,
            sellPrice: 78000,
            legno: true,
            material: true,
        },
        {
            unique_code: "PRO-2026-012",
            title: "Posa pergola villa Locarno",
            name: "Posa pergola villa Locarno",
            task_type: "LAVORO",
            clientId: clientIds[9],
            kanbanId: posaKanbanId,
            kanbanColumnId: posaTodoCol,
            column_id: posaTodoCol,
            column_position: 1,
            sellPrice: 4200,
            legno: true,
        },
        {
            unique_code: "SER-2026-001",
            title: "Manutenzione pergola Lugano",
            name: "Manutenzione pergola Lugano",
            task_type: "LAVORO",
            clientId: clientIds[1],
            kanbanId: serviceKanbanId,
            kanbanColumnId: servicePianCol,
            column_id: servicePianCol,
            column_position: 1,
            sellPrice: 1800,
            legno: true,
        },
        {
            unique_code: "AVO-2026-004",
            title: "AVOR condominio Bellinzona",
            name: "AVOR condominio Bellinzona",
            task_type: "LAVORO",
            clientId: clientIds[8],
            kanbanId: avorKanbanId,
            kanbanColumnId: avorTodoCol,
            column_id: avorTodoCol,
            column_position: 1,
            sellPrice: 96000,
            legno: true,
        },
        {
            unique_code: "OFF-2026-008",
            title: "Arredi su misura villa Lugano",
            name: "Arredi su misura villa Lugano",
            task_type: "OFFERTA",
            clientId: clientIds[1],
            kanbanId: offerKanbanId,
            kanbanColumnId: offerInviataCol,
            column_id: offerInviataCol,
            column_position: 2,
            sellPrice: 22400,
            legno: true,
        },
    ];

    let createdCount = 0;

    for (const task of tasks) {
        const { data: existing } = await supabase
            .from("Task")
            .select("id")
            .eq("site_id", siteId)
            .eq("unique_code", task.unique_code)
            .maybeSingle();

        if (existing) continue;

        const { error } = await supabase.from("Task").insert({
            ...task,
            site_id: siteId,
            status: "open",
            percentStatus: 10,
            material: task.material ?? false,
            ferramenta: (task as { ferramenta?: boolean }).ferramenta ?? false,
            metalli: false,
            legno: task.legno ?? true,
        });

        if (error) {
            throw new Error(`Task ${task.unique_code}: ${error.message}`);
        }

        createdCount++;
    }

    console.log(`✓ ${tasks.length} progetti demo (${createdCount} nuovi)`);
}

async function ensureInventoryStructure(siteId: string) {
    const { data: existingWarehouse } = await supabase
        .from("inventory_warehouses")
        .select("id")
        .eq("site_id", siteId)
        .eq("name", "Magazzino principale")
        .maybeSingle();

    let warehouseId = existingWarehouse?.id;

    if (!warehouseId) {
        const { data: warehouse, error } = await supabase
            .from("inventory_warehouses")
            .insert({ site_id: siteId, name: "Magazzino principale", code: "MAG-01" })
            .select("id")
            .single();

        if (error || !warehouse) {
            throw new Error(`inventory_warehouses: ${error?.message}`);
        }

        warehouseId = warehouse.id;
    }

    const suppliers = [
        { name: "Legno Alpino SA", code: "LEG-ALP", email: "ordini@legnoalpino.ch" },
        { name: "Ferramenta Ticino", code: "FER-TIC", email: "info@ferramentaticino.ch" },
        { name: "Vernici & Finiture CH", code: "VER-CH", email: "vendite@vernici.ch" },
    ];

    const supplierIdByCode = new Map<string, string>();

    for (const supplier of suppliers) {
        const { data: existing } = await supabase
            .from("inventory_suppliers")
            .select("id")
            .eq("site_id", siteId)
            .eq("code", supplier.code)
            .maybeSingle();

        if (existing) {
            supplierIdByCode.set(supplier.code, existing.id);
            continue;
        }

        const { data: created, error } = await supabase
            .from("inventory_suppliers")
            .insert({ site_id: siteId, ...supplier })
            .select("id")
            .single();

        if (error || !created) {
            throw new Error(`inventory_suppliers ${supplier.code}: ${error?.message}`);
        }

        supplierIdByCode.set(supplier.code, created.id);
    }

    type CatDef = { name: string; code: string; parent?: string; sort_order: number };
    const categoryDefs: CatDef[] = [
        { name: "Legno", code: "LEG", sort_order: 1 },
        { name: "Massello", code: "LEG-MAS", parent: "Legno", sort_order: 1 },
        { name: "Lamellare", code: "LEG-LAM", parent: "Legno", sort_order: 2 },
        { name: "Compensato/Multistrato", code: "LEG-COM", parent: "Legno", sort_order: 3 },
        { name: "Pannelli", code: "PAN", sort_order: 2 },
        { name: "Truciolare", code: "PAN-TRU", parent: "Pannelli", sort_order: 1 },
        { name: "MDF", code: "PAN-MDF", parent: "Pannelli", sort_order: 2 },
        { name: "OSB", code: "PAN-OSB", parent: "Pannelli", sort_order: 3 },
        { name: "Ferramenta", code: "FER", sort_order: 3 },
        { name: "Viti", code: "FER-VIT", parent: "Ferramenta", sort_order: 1 },
        { name: "Cerniere", code: "FER-CER", parent: "Ferramenta", sort_order: 2 },
        { name: "Serrature", code: "FER-SER", parent: "Ferramenta", sort_order: 3 },
        { name: "Colle e vernici", code: "COL", sort_order: 4 },
        { name: "Isolanti", code: "ISO", sort_order: 5 },
        { name: "Guarnizioni", code: "GUA", sort_order: 6 },
    ];

    const categoryIdByName = new Map<string, string>();

    for (const cat of categoryDefs.filter((c) => !c.parent)) {
        const { data: existing } = await supabase
            .from("inventory_categories")
            .select("id")
            .eq("site_id", siteId)
            .eq("name", cat.name)
            .maybeSingle();

        if (existing) {
            categoryIdByName.set(cat.name, existing.id);
            continue;
        }

        const { data: created, error } = await supabase
            .from("inventory_categories")
            .insert({ site_id: siteId, name: cat.name, code: cat.code, sort_order: cat.sort_order })
            .select("id")
            .single();

        if (error || !created) {
            throw new Error(`inventory_categories ${cat.name}: ${error?.message}`);
        }

        categoryIdByName.set(cat.name, created.id);
    }

    for (const cat of categoryDefs.filter((c) => c.parent)) {
        const parentId = categoryIdByName.get(cat.parent!);
        if (!parentId) continue;

        const { data: existing } = await supabase
            .from("inventory_categories")
            .select("id")
            .eq("site_id", siteId)
            .eq("name", cat.name)
            .maybeSingle();

        if (existing) {
            categoryIdByName.set(cat.name, existing.id);
            continue;
        }

        const { data: created, error } = await supabase
            .from("inventory_categories")
            .insert({
                site_id: siteId,
                name: cat.name,
                code: cat.code,
                parent_id: parentId,
                sort_order: cat.sort_order,
            })
            .select("id")
            .single();

        if (error || !created) {
            throw new Error(`inventory_categories ${cat.name}: ${error?.message}`);
        }

        categoryIdByName.set(cat.name, created.id);
    }

    const { data: unitPz } = await supabase
        .from("inventory_units")
        .select("id")
        .eq("code", "pz")
        .maybeSingle();

    const { data: unitMq } = await supabase
        .from("inventory_units")
        .select("id")
        .eq("code", "m2")
        .maybeSingle();

    const items = [
        {
            name: "Abete massello 40x120",
            category: "Massello",
            supplier: "LEG-ALP",
            internal_code: "LEG-ABE-40",
            quantity: 85,
            unit_id: unitPz?.id,
            attributes: { wood: "Abete", section: "40x120", length: 4000 },
            purchase_unit_price: 12.5,
        },
        {
            name: "Larice lamellare 80x200",
            category: "Lamellare",
            supplier: "LEG-ALP",
            internal_code: "LEG-LAR-80",
            quantity: 42,
            unit_id: unitPz?.id,
            attributes: { wood: "Larice", section: "80x200", length: 6000 },
            purchase_unit_price: 38,
        },
        {
            name: "Multistrato betulla 18mm",
            category: "Compensato/Multistrato",
            supplier: "LEG-ALP",
            internal_code: "LEG-MUL-18",
            quantity: 120,
            unit_id: unitMq?.id,
            attributes: { material: "Betulla", thickness: 18 },
            purchase_unit_price: 42,
        },
        {
            name: "MDF idro 19mm",
            category: "MDF",
            supplier: "LEG-ALP",
            internal_code: "PAN-MDF-19",
            quantity: 96,
            unit_id: unitMq?.id,
            attributes: { material: "MDF idro", thickness: 19 },
            purchase_unit_price: 28,
        },
        {
            name: "Vite torx 4x40 conf. 500",
            category: "Viti",
            supplier: "FER-TIC",
            internal_code: "FER-VIT-440",
            quantity: 24,
            unit_id: unitPz?.id,
            attributes: { size: "4x40", pack: 500 },
            purchase_unit_price: 18,
        },
        {
            name: "Cerniera a scomparsa 110°",
            category: "Cerniere",
            supplier: "FER-TIC",
            internal_code: "FER-CER-110",
            quantity: 150,
            unit_id: unitPz?.id,
            attributes: { angle: 110, soft_close: true },
            purchase_unit_price: 6.5,
        },
        {
            name: "Vernice impregnante noce",
            category: "Colle e vernici",
            supplier: "VER-CH",
            internal_code: "VER-NOC-5L",
            quantity: 18,
            unit_id: unitPz?.id,
            attributes: { color: "Noce", volume: "5L" },
            purchase_unit_price: 65,
        },
    ];

    let itemsCreated = 0;

    for (const item of items) {
        const { data: existingItem } = await supabase
            .from("inventory_items")
            .select("id")
            .eq("site_id", siteId)
            .eq("name", item.name)
            .maybeSingle();

        let itemId = existingItem?.id;

        if (!itemId) {
            const { data: createdItem, error: itemError } = await supabase
                .from("inventory_items")
                .insert({
                    site_id: siteId,
                    name: item.name,
                    category_id: categoryIdByName.get(item.category),
                    supplier_id: supplierIdByCode.get(item.supplier),
                    item_type: "materiale",
                    is_stocked: true,
                    is_consumable: true,
                    is_active: true,
                })
                .select("id")
                .single();

            if (itemError || !createdItem) {
                throw new Error(`inventory_items ${item.name}: ${itemError?.message}`);
            }

            itemId = createdItem.id;
            itemsCreated++;
        }

        const { data: existingVariant } = await supabase
            .from("inventory_item_variants")
            .select("id")
            .eq("site_id", siteId)
            .eq("internal_code", item.internal_code)
            .maybeSingle();

        let variantId = existingVariant?.id;

        if (!variantId) {
            const { data: createdVariant, error: variantError } = await supabase
                .from("inventory_item_variants")
                .insert({
                    item_id: itemId,
                    site_id: siteId,
                    internal_code: item.internal_code,
                    unit_id: item.unit_id,
                    purchase_unit_price: item.purchase_unit_price,
                    attributes: item.attributes,
                })
                .select("id")
                .single();

            if (variantError || !createdVariant) {
                throw new Error(`inventory_item_variants ${item.internal_code}: ${variantError?.message}`);
            }

            variantId = createdVariant.id;

            const { data: existingMovement } = await supabase
                .from("inventory_stock_movements")
                .select("id")
                .eq("site_id", siteId)
                .eq("variant_id", variantId)
                .eq("movement_type", "opening")
                .maybeSingle();

            if (!existingMovement) {
                const { error: movError } = await supabase.from("inventory_stock_movements").insert({
                    site_id: siteId,
                    variant_id: variantId,
                    warehouse_id: warehouseId,
                    movement_type: "opening",
                    quantity: item.quantity,
                    reason: "Stock iniziale demo Scherman",
                });

                if (movError) {
                    throw new Error(`inventory_stock_movements ${item.internal_code}: ${movError.message}`);
                }
            }
        }
    }

    console.log(`✓ Magazzino: 1 warehouse, ${suppliers.length} fornitori, ${categoryIdByName.size} categorie, ${items.length} articoli (${itemsCreated} nuovi)`);
}

async function main() {
    console.log("🌲 Seed workspace Scherman\n");

    const { siteId, organizationId, logoUrl } = await ensureOrganizationAndSite();
    await uploadLogo(siteId, logoUrl);

    const kanbanIdByIdentifier = await ensureKanbanStructure(siteId);
    await ensureDraftUsers(siteId, organizationId);
    const clientIds = await ensureDemoClients(siteId, organizationId);
    await ensureDemoProducts(siteId);
    await ensureDemoTasks(siteId, clientIds, kanbanIdByIdentifier);
    await ensureInventoryStructure(siteId);

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost";
    console.log(`\n✅ Workspace Scherman pronto`);
    console.log(`   URL: https://${SUBDOMAIN}.${rootDomain}`);
    console.log(`   Site ID: ${siteId}`);
}

main().catch((err) => {
    console.error("\n❌ Seed fallito:", err);
    process.exit(1);
});
