/**
 * Seed workspace "Suisseframe" (sistemi di serramenti legno / legno-alluminio).
 *
 * Rispecchia la STRUTTURA dello spazio Scherman (stesse Kanban principali),
 * con il gruppo Produzione riadattato ai prodotti Suisseframe.
 * Inserisce i dati reali condivisi: clienti, collaboratori (draft) e prodotti.
 * NON copia immagini e NON crea progetti demo (kanban vuote).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-suisseframe.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = "suisseframe";
const ORG_NAME = "Suisseframe";
const SITE_NAME = "Suisseframe";
const SITE_DESCRIPTION = "Sistemi di serramenti in legno e legno-alluminio";

const LOGO_PATH = join(
    process.cwd(),
    "../.cursor/projects/Users-matteopaolocci-santini-manager/assets/Acquisizione_schermata_07.07.2026_alle_00.20.46-b28ead24-8707-4d2e-b458-5f17ec015e96.png",
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

/** Colonne di produzione standard (come Scherman - Serramenti). */
function productionColumns(boardId: string) {
    return [
        { title: "To do", identifier: `to_do_${boardId}`, position: 1, column_type: "normal", is_creation_column: true },
        { title: "CNC", identifier: `cnc_${boardId}`, position: 2, column_type: "normal", is_creation_column: false },
        { title: "Prep.", identifier: `prep_${boardId}`, position: 3, column_type: "normal", is_creation_column: false },
        { title: "Finitura", identifier: `finitura_${boardId}`, position: 4, column_type: "normal", is_creation_column: false },
        { title: "Montaggio", identifier: `montaggio_${boardId}`, position: 5, column_type: "normal", is_creation_column: false },
        { title: "Qualità", identifier: `qualita_${boardId}`, position: 6, column_type: "normal", is_creation_column: false },
        { title: "Spedito", identifier: `spedito_${boardId}`, position: 7, column_type: "invoicing", is_creation_column: false },
    ];
}

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
    // --- Gruppo Produzione (personalizzato Suisseframe) ---
    {
        title: "Generale",
        identifier: "generale",
        categoryIdentifier: "produzione",
        color: "#6b7280",
        icon: "LayoutGrid",
        is_production_kanban: true,
        columns: productionColumns("generale"),
    },
    {
        title: "HST - HM",
        identifier: "hst_hm",
        categoryIdentifier: "produzione",
        color: "#3516a7",
        icon: "Frame",
        is_production_kanban: true,
        columns: productionColumns("hst_hm"),
    },
    {
        title: "HST - H",
        identifier: "hst_h",
        categoryIdentifier: "produzione",
        color: "#2563eb",
        icon: "Frame",
        is_production_kanban: true,
        columns: productionColumns("hst_h"),
    },
    {
        title: "WIN",
        identifier: "win",
        categoryIdentifier: "produzione",
        color: "#0ea5e9",
        icon: "AppWindow",
        is_production_kanban: true,
        columns: productionColumns("win"),
    },
    {
        title: "WALL",
        identifier: "wall",
        categoryIdentifier: "produzione",
        color: "#a03784",
        icon: "Building2",
        is_production_kanban: true,
        columns: productionColumns("wall"),
    },
    {
        title: "SPECIAL",
        identifier: "special",
        categoryIdentifier: "produzione",
        color: "#e14705",
        icon: "Sparkles",
        is_production_kanban: true,
        columns: productionColumns("special"),
    },
    // --- Fine gruppo Produzione ---
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
            { title: "Esecuzione", identifier: "esecuzione_diversi", position: 3, column_type: "normal", is_creation_column: false },
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

/** Collaboratori reali condivisi (creati come utenti draft, nessuna email di invito). */
const DRAFT_USERS = [
    { given_name: "Asmerom", family_name: "Berhe", email: "asmie3113@gmail.com" },
    { given_name: "Dragan", family_name: "Tesic", email: "info@suisseframe.ch" },
    { given_name: "Zane", family_name: "Milosevic", email: "zanemilo80@gmail.com" },
    { given_name: "Manuel", family_name: "Sala", email: "manuel@suisseframe.ch" },
    { given_name: "Evelyne", family_name: "Bernasconi", email: "evelyne@suisseframe.ch" },
    { given_name: "Antonio", family_name: "Canonico", email: "canonico.a@libero.it" },
];

/** Clienti reali condivisi. */
const CLIENTS = [
    { code: "SF-001", businessName: "3p Fenster AG", zipCode: 8197, city: "Rafz", address: "Hegi 34" },
    { code: "SF-002", businessName: "Aare-Fenster GmbH", zipCode: 3294, city: "Büren an der Aare", address: "Bernstrasse 35" },
    { code: "SF-003", businessName: "AD Posa Sagl", zipCode: 6616, city: "Losone", address: "Via ai Grotti 1" },
    { code: "SF-004", businessName: "Baccialegno Sagl", zipCode: 6514, city: "Sementina", address: "Via Pobbia 10" },
    { code: "SF-005", businessName: "Bärtschi Fenster AG", zipCode: 3627, city: "Heimberg", address: "Bernstrasse 247" },
    { code: "SF-006", businessName: "Bernasconi Lorenzo SA", zipCode: 6930, city: "Bedano", address: "Via Industrie 16" },
    { code: "SF-007", businessName: "Breitenstein AG", zipCode: 4442, city: "Diepflingen", address: "" },
    { code: "SF-008", businessName: "Dratex Sagl", zipCode: 6523, city: "Preonzo", address: "El Stradon 87" },
    { code: "SF-009", businessName: "Edelweiss Fenster AG", zipCode: 9500, city: "Wil", address: "Toggenburgerstrasse 124" },
    { code: "SF-010", businessName: "ERNE AG Holzbau", zipCode: 5080, city: "Laufenburg", address: "Werkstrasse 3" },
    { code: "SF-011", businessName: "Falegnameria f.lli Bugada SA", zipCode: 6933, city: "Muzzano", address: "Via Brusada 3" },
    { code: "SF-012", businessName: "Falegnameria Perucchi Faldabacc Sagl", zipCode: 6616, city: "Losone", address: "Via ai Molini 49" },
    { code: "SF-013", businessName: "Falegnameria Radical Sagl", zipCode: 6950, city: "Tesserete", address: "Via al Convento 13" },
    { code: "SF-014", businessName: "Falegnameria Rondini SA", zipCode: 6710, city: "Biasca", address: "Via Lugano 19", landlinePhone: "+41918623135" },
    { code: "SF-015", businessName: "Fenster-Center AG Reinach", zipCode: 5734, city: "Reinach AG", address: "Aarauerstrasse 29" },
    { code: "SF-016", businessName: "Fenster Nauer AG", zipCode: 8833, city: "Samstagern", address: "Weberrütistrasse 2" },
];

/** Prodotti reali condivisi. */
const PRODUCTS = [
    { name: "Altro", type: "Altro", internal_code: "SF-ALTRO" },
    { name: "SF220 2.0 Classico", type: "Legno-legno", internal_code: "SF220-2.0-CL" },
    { name: "SF620 2.0 Classico", type: "Legno-alluminio", internal_code: "SF620-2.0-CL" },
    { name: "SF620 2.0 Panorama", type: "Legno-alluminio", internal_code: "SF620-2.0-PA" },
    { name: "SF620 2.0 SLIM", type: "Legno-alluminio", internal_code: "SF620-2.0-SL" },
    { name: "SF HM74", type: "Legno-alluminio", internal_code: "SF-HM74" },
    { name: "SF IV74", type: "Legno-legno", internal_code: "SF-IV74" },
    { name: "SF WALL", type: "Pfostenriegel", internal_code: "SF-WALL" },
];

const PRODUCT_CATEGORY_COLORS: Record<string, string> = {
    "Legno-legno": "#84CC16",
    "Legno-alluminio": "#3B82F6",
    "Pfostenriegel": "#F97316",
    "Altro": "#6B7280",
};

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
            console.log(`↷ ${person.given_name} ${person.family_name} — già presente, collegato al sito`);
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

async function ensureClients(siteId: string, organizationId: string) {
    let count = 0;

    for (const client of CLIENTS) {
        const { data: existing } = await supabase
            .from("Client")
            .select("id")
            .eq("site_id", siteId)
            .eq("code", client.code)
            .maybeSingle();

        if (existing) continue;

        const { error } = await supabase.from("Client").insert({
            code: client.code,
            clientType: "BUSINESS",
            businessName: client.businessName,
            address: client.address || null,
            zipCode: client.zipCode,
            city: client.city,
            countryCode: "CH",
            landlinePhone: (client as { landlinePhone?: string }).landlinePhone || null,
            site_id: siteId,
            organization_id: organizationId,
            contactPeople: [],
        });

        if (error) {
            throw new Error(`Client ${client.code}: ${error.message}`);
        }

        count++;
    }

    console.log(`✓ ${CLIENTS.length} clienti (${count} nuovi)`);
}

async function ensureProducts(siteId: string) {
    const categoryNames = Array.from(new Set(PRODUCTS.map((p) => p.type)));
    const categoryIdByName = new Map<string, number>();

    for (const name of categoryNames) {
        const { data: existing } = await supabase
            .from("sellproduct_categories")
            .select("id")
            .eq("site_id", siteId)
            .eq("name", name)
            .maybeSingle();

        if (existing) {
            categoryIdByName.set(name, existing.id);
            continue;
        }

        const { data: created, error } = await supabase
            .from("sellproduct_categories")
            .insert({ site_id: siteId, name, color: PRODUCT_CATEGORY_COLORS[name] || "#6B7280" })
            .select("id")
            .single();

        if (error || !created) {
            throw new Error(`sellproduct_categories ${name}: ${error?.message}`);
        }

        categoryIdByName.set(name, created.id);
    }

    let count = 0;

    for (const product of PRODUCTS) {
        const { data: existing } = await supabase
            .from("SellProduct")
            .select("id")
            .eq("site_id", siteId)
            .eq("internal_code", product.internal_code)
            .maybeSingle();

        if (existing) continue;

        const { error } = await supabase.from("SellProduct").insert({
            site_id: siteId,
            name: product.name,
            type: product.type,
            category_id: categoryIdByName.get(product.type),
            internal_code: product.internal_code,
            active: true,
            price_list: true,
        });

        if (error) {
            throw new Error(`SellProduct ${product.internal_code}: ${error.message}`);
        }

        count++;
    }

    console.log(`✓ ${categoryNames.length} categorie prodotti, ${PRODUCTS.length} prodotti (${count} nuovi)`);
}

async function ensureInventoryStructure(siteId: string) {
    const { data: existingWarehouse } = await supabase
        .from("inventory_warehouses")
        .select("id")
        .eq("site_id", siteId)
        .eq("name", "Magazzino principale")
        .maybeSingle();

    if (!existingWarehouse) {
        const { error } = await supabase
            .from("inventory_warehouses")
            .insert({ site_id: siteId, name: "Magazzino principale", code: "MAG-01" });

        if (error) {
            throw new Error(`inventory_warehouses: ${error.message}`);
        }
    }

    type CatDef = { name: string; code: string; parent?: string; sort_order: number };
    const categoryDefs: CatDef[] = [
        { name: "Legno", code: "LEG", sort_order: 1 },
        { name: "Massello", code: "LEG-MAS", parent: "Legno", sort_order: 1 },
        { name: "Lamellare", code: "LEG-LAM", parent: "Legno", sort_order: 2 },
        { name: "Compensato/Multistrato", code: "LEG-COM", parent: "Legno", sort_order: 3 },
        { name: "Alluminio", code: "ALU", sort_order: 2 },
        { name: "Profili alluminio", code: "ALU-PRO", parent: "Alluminio", sort_order: 1 },
        { name: "Lamiere alluminio", code: "ALU-LAM", parent: "Alluminio", sort_order: 2 },
        { name: "Vetro", code: "VET", sort_order: 3 },
        { name: "Ferramenta", code: "FER", sort_order: 4 },
        { name: "Cerniere", code: "FER-CER", parent: "Ferramenta", sort_order: 1 },
        { name: "Serrature", code: "FER-SER", parent: "Ferramenta", sort_order: 2 },
        { name: "Viti", code: "FER-VIT", parent: "Ferramenta", sort_order: 3 },
        { name: "Colle e vernici", code: "COL", sort_order: 5 },
        { name: "Guarnizioni", code: "GUA", sort_order: 6 },
        { name: "Isolanti", code: "ISO", sort_order: 7 },
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

        const { error } = await supabase
            .from("inventory_categories")
            .insert({
                site_id: siteId,
                name: cat.name,
                code: cat.code,
                parent_id: parentId,
                sort_order: cat.sort_order,
            });

        if (error) {
            throw new Error(`inventory_categories ${cat.name}: ${error.message}`);
        }

        categoryIdByName.set(cat.name, "child");
    }

    console.log(`✓ Magazzino: 1 warehouse, ${categoryDefs.length} categorie (struttura)`);
}

async function main() {
    console.log("🪟 Seed workspace Suisseframe\n");

    const { siteId, organizationId, logoUrl } = await ensureOrganizationAndSite();
    await uploadLogo(siteId, logoUrl);

    await ensureKanbanStructure(siteId);
    await ensureDraftUsers(siteId, organizationId);
    await ensureClients(siteId, organizationId);
    await ensureProducts(siteId);
    await ensureInventoryStructure(siteId);

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost";
    console.log(`\n✅ Workspace Suisseframe pronto`);
    console.log(`   URL: https://${SUBDOMAIN}.${rootDomain}`);
    console.log(`   Site ID: ${siteId}`);
}

main().catch((err) => {
    console.error("\n❌ Seed fallito:", err);
    process.exit(1);
});
