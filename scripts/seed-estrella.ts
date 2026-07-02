/**
 * Seed workspace "Estrella" (acciaio smaltato & tantalio).
 *
 * Rispecchia la struttura dello spazio Santini (stesse Kanban principali),
 * con le board di Produzione riadattate ai prodotti Estrella AG / Testrella AG.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-estrella.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = "estrella";
const ORG_NAME = "Estrella AG";
const SITE_NAME = "Estrella";
const SITE_DESCRIPTION = "Acciaio smaltato & tantalio";

const LOGO_PATH = join(
    process.cwd(),
    "../.cursor/projects/Users-matteopaolocci-santini-manager/assets/Acquisizione_schermata_02.07.2026_alle_07.52.41-2ef7fdbd-bcc1-4ee9-b66b-926fc4e8ed6c.png",
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
        title: "1. Apparecchi smaltati",
        identifier: "apparecchi",
        categoryIdentifier: "produzione",
        color: "#3516a7",
        icon: "Container",
        is_production_kanban: true,
        columns: [
            { title: "To Do", identifier: "to_do_apparecchi", position: 1, column_type: "normal", is_creation_column: true },
            { title: "Fabbricazione", identifier: "fabbricazione_apparecchi", position: 2, column_type: "normal", is_creation_column: false },
            { title: "Saldatura", identifier: "saldatura_apparecchi", position: 3, column_type: "normal", is_creation_column: false },
            { title: "Sabbiatura", identifier: "sabbiatura_apparecchi", position: 4, column_type: "normal", is_creation_column: false },
            { title: "Smaltatura", identifier: "smaltatura_apparecchi", position: 5, column_type: "normal", is_creation_column: false },
            { title: "Cottura", identifier: "cottura_apparecchi", position: 6, column_type: "normal", is_creation_column: false },
            { title: "Collaudo", identifier: "collaudo_apparecchi", position: 7, column_type: "normal", is_creation_column: false },
            { title: "Spedito", identifier: "spedito_apparecchi", position: 8, column_type: "invoicing", is_creation_column: false },
        ],
    },
    {
        title: "2. Colonne",
        identifier: "colonne",
        categoryIdentifier: "produzione",
        color: "#ff8647",
        icon: "Columns3",
        is_production_kanban: true,
        columns: [
            { title: "To Do", identifier: "to_do_colonne", position: 1, column_type: "normal", is_creation_column: true },
            { title: "Fabbricazione", identifier: "fabbricazione_colonne", position: 2, column_type: "normal", is_creation_column: false },
            { title: "Saldatura", identifier: "saldatura_colonne", position: 3, column_type: "normal", is_creation_column: false },
            { title: "Smaltatura", identifier: "smaltatura_colonne", position: 4, column_type: "normal", is_creation_column: false },
            { title: "Cottura", identifier: "cottura_colonne", position: 5, column_type: "normal", is_creation_column: false },
            { title: "Collaudo", identifier: "collaudo_colonne", position: 6, column_type: "normal", is_creation_column: false },
            { title: "Spedito", identifier: "spedito_colonne", position: 7, column_type: "invoicing", is_creation_column: false },
        ],
    },
    {
        title: "3. Tubazioni",
        identifier: "tubazioni",
        categoryIdentifier: "produzione",
        color: "#fbbf24",
        icon: "Waypoints",
        is_production_kanban: true,
        columns: [
            { title: "To Do", identifier: "to_do_tubazioni", position: 1, column_type: "normal", is_creation_column: true },
            { title: "Taglio", identifier: "taglio_tubazioni", position: 2, column_type: "normal", is_creation_column: false },
            { title: "Saldatura", identifier: "saldatura_tubazioni", position: 3, column_type: "normal", is_creation_column: false },
            { title: "Smaltatura", identifier: "smaltatura_tubazioni", position: 4, column_type: "normal", is_creation_column: false },
            { title: "Collaudo", identifier: "collaudo_tubazioni", position: 5, column_type: "normal", is_creation_column: false },
            { title: "Spedito", identifier: "spedito_tubazioni", position: 6, column_type: "invoicing", is_creation_column: false },
        ],
    },
    {
        title: "4. Scambiatori tantalio",
        identifier: "scambiatori",
        categoryIdentifier: "produzione",
        color: "#14b8a6",
        icon: "Flame",
        is_production_kanban: true,
        columns: [
            { title: "To Do", identifier: "to_do_scambiatori", position: 1, column_type: "normal", is_creation_column: true },
            { title: "Fabbricazione", identifier: "fabbricazione_scambiatori", position: 2, column_type: "normal", is_creation_column: false },
            { title: "Saldatura tantalio", identifier: "saldatura_scambiatori", position: 3, column_type: "normal", is_creation_column: false },
            { title: "Assemblaggio", identifier: "assemblaggio_scambiatori", position: 4, column_type: "normal", is_creation_column: false },
            { title: "NDT / Controllo", identifier: "controllo_scambiatori", position: 5, column_type: "normal", is_creation_column: false },
            { title: "Spedito", identifier: "spedito_scambiatori", position: 6, column_type: "invoicing", is_creation_column: false },
        ],
    },
    {
        title: "5. Elementi riscaldanti tantalio",
        identifier: "elementi",
        categoryIdentifier: "produzione",
        color: "#a03784",
        icon: "Zap",
        is_production_kanban: true,
        columns: [
            { title: "To Do", identifier: "to_do_elementi", position: 1, column_type: "normal", is_creation_column: true },
            { title: "Lavorazione", identifier: "lavorazione_elementi", position: 2, column_type: "normal", is_creation_column: false },
            { title: "Assemblaggio", identifier: "assemblaggio_elementi", position: 3, column_type: "normal", is_creation_column: false },
            { title: "Controllo", identifier: "controllo_elementi", position: 4, column_type: "normal", is_creation_column: false },
            { title: "Spedito", identifier: "spedito_elementi", position: 5, column_type: "invoicing", is_creation_column: false },
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

const DRAFT_USERS = [
    { given_name: "Florian", family_name: "Seedorff", email: "f.seedorff@estrella.ch", company_role: "Managing Director / Owner" },
    { given_name: "Lucy", family_name: "Seedorff", email: "l.seedorff@estrella.ch", company_role: "Controlling / Owner" },
    { given_name: "Sascha", family_name: "Link", email: "s.link@estrella.ch", company_role: "Chief Technical Officer" },
    { given_name: "Danilo", family_name: "Pagliula", email: "d.pagliula@estrella.ch", company_role: "Deputy Managing Director, Order Management & Logistics" },
    { given_name: "Francis", family_name: "Boeglin", email: "f.boeglin@estrella.ch", company_role: "Chief Technical Officer (retired)" },
    { given_name: "Christian", family_name: "Helmstetter", email: "c.helmstetter@estrella.ch", company_role: "Consultant to Owners" },
    { given_name: "Christophe", family_name: "Mura", email: "c.mura@estrella.ch", company_role: "Head of Quality Division" },
    { given_name: "René", family_name: "Egeli", email: "r.egeli@estrella.ch", company_role: "Head of Non Destructive Testing" },
    { given_name: "Timo", family_name: "Bühler", email: "t.buehler@estrella.ch", company_role: "Quality Assurance and Non-Destructive Testing" },
    { given_name: "Laurent", family_name: "Untereiner", email: "l.untereiner@estrella.ch", company_role: "Production Coordinator, Operations, Technology & Construction" },
    { given_name: "Franck", family_name: "Zimmermann", email: "f.zimmermann@estrella.ch", company_role: "Production Coordinator Glass-Lining, Research and Development" },
    { given_name: "Luc", family_name: "Brengard", email: "l.brengard@estrella.ch", company_role: "Head of Technical Office" },
    { given_name: "Caroline", family_name: "Selles", email: "c.selles@estrella.ch", company_role: "Technical Sales Manager" },
    { given_name: "Marie-Paule", family_name: "Ueberschlag", email: "m.ueberschlag@estrella.ch", company_role: "Head of Purchasing" },
    { given_name: "Fabienne", family_name: "Lauer", email: "f.lauer@estrella.ch", company_role: "Sales and logistics" },
    { given_name: "Audrey", family_name: "Gesser", email: "a.gesser@estrella.ch", company_role: "Purchasing" },
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
            code: "EST-001",
            clientType: "BUSINESS",
            businessName: "Basel Chemie AG",
            email: "procurement@baselchemie.ch",
            city: "Basel",
            address: "Rheinweg 24",
            zipCode: 4057,
            countryCode: "CH",
            landlinePhone: "+41 61 555 10 20",
        },
        {
            code: "EST-002",
            clientType: "BUSINESS",
            businessName: "Rheintal Pharma AG",
            email: "einkauf@rheintalpharma.ch",
            city: "Pratteln",
            address: "Industriestrasse 8",
            zipCode: 4133,
            countryCode: "CH",
            landlinePhone: "+41 61 555 30 40",
        },
        {
            code: "EST-003",
            clientType: "BUSINESS",
            businessName: "Helvetia Fine Chemicals SA",
            email: "achats@helvetiafinechem.ch",
            city: "Monthey",
            address: "Route de l'Industrie 15",
            zipCode: 1870,
            countryCode: "CH",
            landlinePhone: "+41 24 555 50 60",
        },
        {
            code: "EST-004",
            clientType: "BUSINESS",
            businessName: "Rhein-Neckar Chemie GmbH",
            email: "einkauf@rhein-neckar-chemie.de",
            city: "Ludwigshafen",
            address: "Chemiepark 3",
            zipCode: 67063,
            countryCode: "DE",
            landlinePhone: "+49 621 555 70 80",
        },
        {
            code: "EST-005",
            clientType: "BUSINESS",
            businessName: "Alpine Specialty Coatings AG",
            email: "info@alpinecoatings.ch",
            city: "Visp",
            address: "Lonzastrasse 42",
            zipCode: 3930,
            countryCode: "CH",
            landlinePhone: "+41 27 555 11 22",
        },
        {
            code: "EST-006",
            clientType: "BUSINESS",
            businessName: "Léman Biotech SA",
            email: "procurement@lemanbiotech.ch",
            city: "Aigle",
            address: "Chemin des Isles 6",
            zipCode: 1860,
            countryCode: "CH",
            landlinePhone: "+41 24 555 33 44",
        },
        {
            code: "EST-007",
            clientType: "BUSINESS",
            businessName: "Danube Process Industries GmbH",
            email: "einkauf@danube-process.at",
            city: "Linz",
            address: "Industriezeile 90",
            zipCode: 4020,
            countryCode: "AT",
            landlinePhone: "+43 732 555 55 66",
        },
        {
            code: "EST-008",
            clientType: "BUSINESS",
            businessName: "Zürich Surface Technology AG",
            email: "einkauf@zh-surfacetech.ch",
            city: "Dübendorf",
            address: "Überlandstrasse 120",
            zipCode: 8600,
            countryCode: "CH",
            landlinePhone: "+41 44 555 77 88",
        },
        {
            code: "EST-009",
            clientType: "BUSINESS",
            businessName: "Provence Chimie Fine SAS",
            email: "achats@provencechimie.fr",
            city: "Aix-en-Provence",
            address: "Zone Industrielle Les Milles 12",
            zipCode: 13290,
            countryCode: "FR",
            landlinePhone: "+33 4 42 55 99 00",
        },
        {
            code: "EST-010",
            clientType: "BUSINESS",
            businessName: "Sankt Gallen Pharmatech AG",
            email: "beschaffung@sg-pharmatech.ch",
            city: "St. Gallen",
            address: "Lerchenfeldstrasse 5",
            zipCode: 9014,
            countryCode: "CH",
            landlinePhone: "+41 71 555 12 34",
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
        { name: "Apparecchi smaltati", color: "#3B82F6" },
        { name: "Colonne", color: "#F97316" },
        { name: "Tubazioni", color: "#8B5CF6" },
        { name: "Scambiatori tantalio", color: "#14B8A6" },
        { name: "Elementi riscaldanti tantalio", color: "#EF4444" },
        { name: "Ri-smaltatura", color: "#84CC16" },
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
        { name: "Serbatoio smaltato 6'300 L", type: "Serbatoi", category: "Apparecchi smaltati", description: "Serbatoio in acciaio smaltato, volume 6'300 L", internal_code: "APP-SER-6300" },
        { name: "Serbatoio smaltato 16'000 L", type: "Serbatoi", category: "Apparecchi smaltati", description: "Serbatoio in acciaio smaltato, volume 16'000 L", internal_code: "APP-SER-16000" },
        { name: "Reattore smaltato 25'000 L", type: "Reattori", category: "Apparecchi smaltati", description: "Reattore smaltato capacità massima 25'000 L", internal_code: "APP-REA-25000" },
        { name: "Separatore smaltato", type: "Separatori", category: "Apparecchi smaltati", description: "Separatore in acciaio smaltato per processi chimici", internal_code: "APP-SEP-01" },
        { name: "Filtro a pressione smaltato", type: "Filtri", category: "Apparecchi smaltati", description: "Filtro a pressione in acciaio smaltato", internal_code: "APP-FIL-01" },
        { name: "Colonna smaltata DN800", type: "Colonne", category: "Colonne", description: "Sezione colonna smaltata diametro DN800", internal_code: "COL-DN800" },
        { name: "Colonna smaltata DN1200", type: "Colonne", category: "Colonne", description: "Sezione colonna smaltata diametro DN1200", internal_code: "COL-DN1200" },
        { name: "Colonna smaltata DN2000", type: "Colonne", category: "Colonne", description: "Sezione colonna smaltata diametro DN2000 (max)", internal_code: "COL-DN2000" },
        { name: "Tubo smaltato DN100", type: "Tubi", category: "Tubazioni", description: "Tubo in acciaio smaltato DN100", internal_code: "TUB-DN100" },
        { name: "Raccordo R2", type: "Raccordi", category: "Tubazioni", description: "Raccordo tubiero R2 a volume morto minimo (farmaceutico)", internal_code: "TUB-R2" },
        { name: "Curva smaltata 90°", type: "Curve", category: "Tubazioni", description: "Curva in acciaio smaltato 90°", internal_code: "TUB-CUR-90" },
        { name: "Valvola smaltata", type: "Valvole", category: "Tubazioni", description: "Valvola in acciaio smaltato", internal_code: "TUB-VAL-01" },
        { name: "Scambiatore a fascio tubiero a U (lungo)", type: "Scambiatori", category: "Scambiatori tantalio", description: "Scambiatore di calore a fascio tubiero a U in tantalio, esecuzione lunga", internal_code: "TAN-SCA-U-L" },
        { name: "Scambiatore a fascio tubiero a U (corto)", type: "Scambiatori", category: "Scambiatori tantalio", description: "Scambiatore di calore a fascio tubiero a U in tantalio, esecuzione corta", internal_code: "TAN-SCA-U-C" },
        { name: "Candela riscaldante verticale", type: "Elementi riscaldanti", category: "Elementi riscaldanti tantalio", description: "Candela riscaldante in tantalio, installazione verticale", internal_code: "TAN-CAN-V" },
        { name: "Candela riscaldante orizzontale", type: "Elementi riscaldanti", category: "Elementi riscaldanti tantalio", description: "Candela riscaldante in tantalio, installazione orizzontale", internal_code: "TAN-CAN-O" },
        { name: "Scaldatore a baionetta orizzontale", type: "Accessori", category: "Elementi riscaldanti tantalio", description: "Scaldatore a baionetta orizzontale in tantalio", internal_code: "TAN-BAI-O" },
        { name: "Ri-smaltatura apparecchio", type: "Servizio", category: "Ri-smaltatura", description: "Ri-smaltatura apparecchio (ca. 65% del prezzo originale)", internal_code: "RIS-APP-01" },
        { name: "Ri-smaltatura colonna", type: "Servizio", category: "Ri-smaltatura", description: "Ri-smaltatura sezione colonna", internal_code: "RIS-COL-01" },
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
    const apparecchiKanbanId = kanbanIdByIdentifier.get("apparecchi")!;
    const colonneKanbanId = kanbanIdByIdentifier.get("colonne")!;
    const tubazioniKanbanId = kanbanIdByIdentifier.get("tubazioni")!;
    const scambiatoriKanbanId = kanbanIdByIdentifier.get("scambiatori")!;
    const elementiKanbanId = kanbanIdByIdentifier.get("elementi")!;
    const serviceKanbanId = kanbanIdByIdentifier.get("service")!;

    if (!offerKanbanId || !avorKanbanId || !apparecchiKanbanId) {
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
        appFabbrCol, appSaldCol, appSmaltCol, appCollaudoCol,
        colFabbrCol, colSmaltCol,
        tubSaldCol, tubTodoCol,
        scaSaldCol, scaAssCol,
        eleLavCol, eleTodoCol,
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
        col(apparecchiKanbanId, "fabbricazione_apparecchi"),
        col(apparecchiKanbanId, "saldatura_apparecchi"),
        col(apparecchiKanbanId, "smaltatura_apparecchi"),
        col(apparecchiKanbanId, "collaudo_apparecchi"),
        col(colonneKanbanId, "fabbricazione_colonne"),
        col(colonneKanbanId, "smaltatura_colonne"),
        col(tubazioniKanbanId, "saldatura_tubazioni"),
        col(tubazioniKanbanId, "to_do_tubazioni"),
        col(scambiatoriKanbanId, "saldatura_scambiatori"),
        col(scambiatoriKanbanId, "assemblaggio_scambiatori"),
        col(elementiKanbanId, "lavorazione_elementi"),
        col(elementiKanbanId, "to_do_elementi"),
        col(serviceKanbanId, "pianificato_service"),
    ]);

    const tasks = [
        {
            unique_code: "OFF-2026-001",
            title: "Reattore smaltato 16'000 L Basel Chemie",
            name: "Reattore smaltato 16'000 L Basel Chemie",
            task_type: "OFFERTA",
            clientId: clientIds[0],
            kanbanId: offerKanbanId,
            kanbanColumnId: offerTrattCol,
            column_id: offerTrattCol,
            column_position: 1,
            sellPrice: 185000,
        },
        {
            unique_code: "OFF-2026-002",
            title: "Colonna smaltata DN1200 Rheintal Pharma",
            name: "Colonna smaltata DN1200 Rheintal Pharma",
            task_type: "OFFERTA",
            clientId: clientIds[1],
            kanbanId: offerKanbanId,
            kanbanColumnId: offerElabCol,
            column_id: offerElabCol,
            column_position: 1,
            sellPrice: 92000,
        },
        {
            unique_code: "OFF-2026-003",
            title: "Scambiatore tantalio a U Helvetia Fine Chemicals",
            name: "Scambiatore tantalio a U Helvetia Fine Chemicals",
            task_type: "OFFERTA",
            clientId: clientIds[2],
            kanbanId: offerKanbanId,
            kanbanColumnId: offerTrattCol,
            column_id: offerTrattCol,
            column_position: 2,
            sellPrice: 78500,
        },
        {
            unique_code: "OFF-2026-004",
            title: "Tubazioni smaltate R2 Rhein-Neckar Chemie",
            name: "Tubazioni smaltate R2 Rhein-Neckar Chemie",
            task_type: "OFFERTA",
            clientId: clientIds[3],
            kanbanId: offerKanbanId,
            kanbanColumnId: offerInviataCol,
            column_id: offerInviataCol,
            column_position: 1,
            sellPrice: 42000,
        },
        {
            unique_code: "OFF-2026-005",
            title: "Candele riscaldanti tantalio Provence Chimie",
            name: "Candele riscaldanti tantalio Provence Chimie",
            task_type: "OFFERTA",
            clientId: clientIds[8],
            kanbanId: offerKanbanId,
            kanbanColumnId: offerElabCol,
            column_id: offerElabCol,
            column_position: 2,
            sellPrice: 56800,
        },
        {
            unique_code: "OFF-2026-006",
            title: "Ri-smaltatura serbatoio Alpine Specialty Coatings",
            name: "Ri-smaltatura serbatoio Alpine Specialty Coatings",
            task_type: "OFFERTA",
            clientId: clientIds[4],
            kanbanId: offerKanbanId,
            kanbanColumnId: offerTodoCol,
            column_id: offerTodoCol,
            column_position: 1,
            sellPrice: 24400,
        },
        {
            unique_code: "OFF-2026-007",
            title: "Serbatoio smaltato 25'000 L Danube Process",
            name: "Serbatoio smaltato 25'000 L Danube Process",
            task_type: "OFFERTA",
            clientId: clientIds[6],
            kanbanId: offerKanbanId,
            kanbanColumnId: offerVintaCol,
            column_id: offerVintaCol,
            column_position: 1,
            sellPrice: 246000,
        },
        {
            unique_code: "AVO-2026-001",
            title: "AVOR reattore smaltato Basel Chemie",
            name: "AVOR reattore smaltato Basel Chemie",
            task_type: "LAVORO",
            clientId: clientIds[0],
            kanbanId: avorKanbanId,
            kanbanColumnId: avorRilievoCol,
            column_id: avorRilievoCol,
            column_position: 1,
            sellPrice: 185000,
            material: true,
        },
        {
            unique_code: "AVO-2026-002",
            title: "AVOR scambiatore tantalio Helvetia",
            name: "AVOR scambiatore tantalio Helvetia",
            task_type: "LAVORO",
            clientId: clientIds[2],
            kanbanId: avorKanbanId,
            kanbanColumnId: avorElabCol,
            column_id: avorElabCol,
            column_position: 1,
            sellPrice: 78500,
            material: true,
        },
        {
            unique_code: "AVO-2026-003",
            title: "AVOR colonna DN2000 Danube Process",
            name: "AVOR colonna DN2000 Danube Process",
            task_type: "LAVORO",
            clientId: clientIds[6],
            kanbanId: avorKanbanId,
            kanbanColumnId: avorProdCol,
            column_id: avorProdCol,
            column_position: 1,
            sellPrice: 132000,
            material: true,
        },
        {
            unique_code: "AVO-2026-004",
            title: "AVOR tubazioni R2 Rhein-Neckar",
            name: "AVOR tubazioni R2 Rhein-Neckar",
            task_type: "LAVORO",
            clientId: clientIds[3],
            kanbanId: avorKanbanId,
            kanbanColumnId: avorTodoCol,
            column_id: avorTodoCol,
            column_position: 1,
            sellPrice: 42000,
        },
        {
            unique_code: "PRO-2026-001",
            title: "Serbatoio smaltato 16'000 L - produzione",
            name: "Serbatoio smaltato 16'000 L - produzione",
            task_type: "LAVORO",
            clientId: clientIds[0],
            kanbanId: apparecchiKanbanId,
            kanbanColumnId: appFabbrCol,
            column_id: appFabbrCol,
            column_position: 1,
            sellPrice: 118500,
            material: true,
        },
        {
            unique_code: "PRO-2026-002",
            title: "Separatore smaltato Léman Biotech",
            name: "Separatore smaltato Léman Biotech",
            task_type: "LAVORO",
            clientId: clientIds[5],
            kanbanId: apparecchiKanbanId,
            kanbanColumnId: appSaldCol,
            column_id: appSaldCol,
            column_position: 1,
            sellPrice: 64000,
            material: true,
        },
        {
            unique_code: "PRO-2026-003",
            title: "Reattore smaltato 25'000 L Danube",
            name: "Reattore smaltato 25'000 L Danube",
            task_type: "LAVORO",
            clientId: clientIds[6],
            kanbanId: apparecchiKanbanId,
            kanbanColumnId: appSmaltCol,
            column_id: appSmaltCol,
            column_position: 1,
            sellPrice: 246000,
            material: true,
        },
        {
            unique_code: "PRO-2026-004",
            title: "Filtro a pressione smaltato Zürich Surface",
            name: "Filtro a pressione smaltato Zürich Surface",
            task_type: "LAVORO",
            clientId: clientIds[7],
            kanbanId: apparecchiKanbanId,
            kanbanColumnId: appCollaudoCol,
            column_id: appCollaudoCol,
            column_position: 1,
            sellPrice: 38900,
            material: true,
        },
        {
            unique_code: "PRO-2026-005",
            title: "Colonna smaltata DN1200 Rheintal Pharma",
            name: "Colonna smaltata DN1200 Rheintal Pharma",
            task_type: "LAVORO",
            clientId: clientIds[1],
            kanbanId: colonneKanbanId,
            kanbanColumnId: colFabbrCol,
            column_id: colFabbrCol,
            column_position: 1,
            sellPrice: 92000,
            material: true,
        },
        {
            unique_code: "PRO-2026-006",
            title: "Colonna smaltata DN2000 Danube",
            name: "Colonna smaltata DN2000 Danube",
            task_type: "LAVORO",
            clientId: clientIds[6],
            kanbanId: colonneKanbanId,
            kanbanColumnId: colSmaltCol,
            column_id: colSmaltCol,
            column_position: 1,
            sellPrice: 132000,
            material: true,
        },
        {
            unique_code: "PRO-2026-007",
            title: "Tubazioni R2 Rhein-Neckar Chemie",
            name: "Tubazioni R2 Rhein-Neckar Chemie",
            task_type: "LAVORO",
            clientId: clientIds[3],
            kanbanId: tubazioniKanbanId,
            kanbanColumnId: tubSaldCol,
            column_id: tubSaldCol,
            column_position: 1,
            sellPrice: 42000,
            material: true,
        },
        {
            unique_code: "PRO-2026-008",
            title: "Tubazioni smaltate Provence Chimie",
            name: "Tubazioni smaltate Provence Chimie",
            task_type: "LAVORO",
            clientId: clientIds[8],
            kanbanId: tubazioniKanbanId,
            kanbanColumnId: tubTodoCol,
            column_id: tubTodoCol,
            column_position: 1,
            sellPrice: 18600,
        },
        {
            unique_code: "PRO-2026-009",
            title: "Scambiatore tantalio a U Helvetia",
            name: "Scambiatore tantalio a U Helvetia",
            task_type: "LAVORO",
            clientId: clientIds[2],
            kanbanId: scambiatoriKanbanId,
            kanbanColumnId: scaSaldCol,
            column_id: scaSaldCol,
            column_position: 1,
            sellPrice: 78500,
            material: true,
        },
        {
            unique_code: "PRO-2026-010",
            title: "Scambiatore tantalio a U (corto) Sankt Gallen",
            name: "Scambiatore tantalio a U (corto) Sankt Gallen",
            task_type: "LAVORO",
            clientId: clientIds[9],
            kanbanId: scambiatoriKanbanId,
            kanbanColumnId: scaAssCol,
            column_id: scaAssCol,
            column_position: 1,
            sellPrice: 61200,
            material: true,
        },
        {
            unique_code: "PRO-2026-011",
            title: "Candele riscaldanti tantalio Provence Chimie",
            name: "Candele riscaldanti tantalio Provence Chimie",
            task_type: "LAVORO",
            clientId: clientIds[8],
            kanbanId: elementiKanbanId,
            kanbanColumnId: eleLavCol,
            column_id: eleLavCol,
            column_position: 1,
            sellPrice: 56800,
            material: true,
        },
        {
            unique_code: "PRO-2026-012",
            title: "Scaldatore a baionetta Léman Biotech",
            name: "Scaldatore a baionetta Léman Biotech",
            task_type: "LAVORO",
            clientId: clientIds[5],
            kanbanId: elementiKanbanId,
            kanbanColumnId: eleTodoCol,
            column_id: eleTodoCol,
            column_position: 1,
            sellPrice: 21400,
        },
        {
            unique_code: "SER-2026-001",
            title: "Ri-smaltatura serbatoio Alpine Specialty Coatings",
            name: "Ri-smaltatura serbatoio Alpine Specialty Coatings",
            task_type: "LAVORO",
            clientId: clientIds[4],
            kanbanId: serviceKanbanId,
            kanbanColumnId: servicePianCol,
            column_id: servicePianCol,
            column_position: 1,
            sellPrice: 24400,
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
            ferramenta: false,
            metalli: true,
            legno: false,
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
        { name: "Acciai Speciali SA", code: "ACC-SPE", email: "ordini@acciaispeciali.ch" },
        { name: "Tantalum Metals GmbH", code: "TAN-MET", email: "sales@tantalum-metals.de" },
        { name: "Smalti Tecnici Industriali", code: "SMA-IND", email: "info@smaltitecnici.it" },
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
        { name: "Acciaio", code: "ACC", sort_order: 1 },
        { name: "Lamiere", code: "ACC-LAM", parent: "Acciaio", sort_order: 1 },
        { name: "Fondi bombati", code: "ACC-FON", parent: "Acciaio", sort_order: 2 },
        { name: "Profili", code: "ACC-PRO", parent: "Acciaio", sort_order: 3 },
        { name: "Tantalio", code: "TAN", sort_order: 2 },
        { name: "Lamiera tantalio", code: "TAN-LAM", parent: "Tantalio", sort_order: 1 },
        { name: "Tubi tantalio", code: "TAN-TUB", parent: "Tantalio", sort_order: 2 },
        { name: "Smalto", code: "SMA", sort_order: 3 },
        { name: "Smalto di base", code: "SMA-BAS", parent: "Smalto", sort_order: 1 },
        { name: "Smalto di copertura", code: "SMA-COP", parent: "Smalto", sort_order: 2 },
        { name: "Consumabili saldatura", code: "SAL", sort_order: 4 },
        { name: "Guarnizioni", code: "GUA", sort_order: 5 },
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

    const { data: unitKg } = await supabase
        .from("inventory_units")
        .select("id")
        .eq("code", "kg")
        .maybeSingle();

    const items = [
        {
            name: "Lamiera acciaio al carbonio 8mm",
            category: "Lamiere",
            supplier: "ACC-SPE",
            internal_code: "ACC-LAM-8",
            quantity: 60,
            unit_id: unitMq?.id,
            attributes: { material: "S235JR", thickness: 8 },
            purchase_unit_price: 45,
        },
        {
            name: "Fondo bombato DN1200",
            category: "Fondi bombati",
            supplier: "ACC-SPE",
            internal_code: "ACC-FON-1200",
            quantity: 12,
            unit_id: unitPz?.id,
            attributes: { diameter: "DN1200", type: "torosferico" },
            purchase_unit_price: 680,
        },
        {
            name: "Lamiera tantalio 0.5mm",
            category: "Lamiera tantalio",
            supplier: "TAN-MET",
            internal_code: "TAN-LAM-05",
            quantity: 8,
            unit_id: unitMq?.id,
            attributes: { material: "Ta", thickness: 0.5 },
            purchase_unit_price: 4200,
        },
        {
            name: "Tubo tantalio DN25",
            category: "Tubi tantalio",
            supplier: "TAN-MET",
            internal_code: "TAN-TUB-25",
            quantity: 40,
            unit_id: unitPz?.id,
            attributes: { material: "Ta", diameter: "DN25" },
            purchase_unit_price: 950,
        },
        {
            name: "Smalto di base (frit) senza nichel",
            category: "Smalto di base",
            supplier: "SMA-IND",
            internal_code: "SMA-BAS-01",
            quantity: 450,
            unit_id: unitKg?.id,
            attributes: { type: "base", nickel_free: true },
            purchase_unit_price: 14.5,
        },
        {
            name: "Smalto di copertura trasparente",
            category: "Smalto di copertura",
            supplier: "SMA-IND",
            internal_code: "SMA-COP-01",
            quantity: 380,
            unit_id: unitKg?.id,
            attributes: { type: "copertura", cobalt_free: true },
            purchase_unit_price: 18,
        },
        {
            name: "Elettrodi TIG per tantalio",
            category: "Consumabili saldatura",
            supplier: "TAN-MET",
            internal_code: "SAL-TIG-TA",
            quantity: 120,
            unit_id: unitPz?.id,
            attributes: { process: "TIG", for: "tantalio" },
            purchase_unit_price: 12,
        },
        {
            name: "Guarnizione PTFE DN100",
            category: "Guarnizioni",
            supplier: "SMA-IND",
            internal_code: "GUA-PTFE-100",
            quantity: 200,
            unit_id: unitPz?.id,
            attributes: { material: "PTFE", size: "DN100" },
            purchase_unit_price: 8.5,
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
                    reason: "Stock iniziale demo Estrella",
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
    console.log("🏭 Seed workspace Estrella\n");

    const { siteId, organizationId, logoUrl } = await ensureOrganizationAndSite();
    await uploadLogo(siteId, logoUrl);

    const kanbanIdByIdentifier = await ensureKanbanStructure(siteId);
    await ensureDraftUsers(siteId, organizationId);
    const clientIds = await ensureDemoClients(siteId, organizationId);
    await ensureDemoProducts(siteId);
    await ensureDemoTasks(siteId, clientIds, kanbanIdByIdentifier);
    await ensureInventoryStructure(siteId);

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost";
    console.log(`\n✅ Workspace Estrella pronto`);
    console.log(`   URL: https://${SUBDOMAIN}.${rootDomain}`);
    console.log(`   Site ID: ${siteId}`);
}

main().catch((err) => {
    console.error("\n❌ Seed fallito:", err);
    process.exit(1);
});
