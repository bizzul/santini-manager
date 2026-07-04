/**
 * Seed demo completo per lo spazio "Estrella" (presentazione).
 *
 * - Aggiorna le schede prodotto con i nomi tedeschi corretti e carica le
 *   immagini reali dei prodotti (bucket `documents`).
 * - Crea la categoria "Glasbeschichtete Rohre" con le 3 schede principali
 *   (gerades Rohr, L-Rohr, T-Rohr) con diametro/lunghezza.
 * - Traduce in tedesco i titoli dei progetti esistenti e li arricchisce con
 *   prodotto collegato, data di consegna e avanzamento.
 * - Crea 12 nuovi progetti collegati ai prodotti, distribuiti sulle kanban,
 *   con collaboratori assegnati.
 * - Popola le presenze dei collaboratori demo (mese corrente + precedente)
 *   e alcune richieste ferie.
 * - Abilita i moduli `attendance` e `resellers` per il sito.
 * - Inserisce le 22 schede rivenditori reali per paese.
 *
 * Idempotente: usa chiavi stabili (internal_code, unique_code, nome+paese).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-estrella-demo-data.ts
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

const ASSETS_DIR = join(
    process.cwd(),
    "../.cursor/projects/Users-matteopaolocci-santini-manager/assets",
);

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase env vars. Run with --env-file=.env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function scopedColumnIdentifier(base: string): string {
    return `${SUBDOMAIN}_${base}`;
}

function daysFromNow(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
}

async function resolveSiteId(): Promise<{ siteId: string; organizationId: string }> {
    const { data, error } = await supabase
        .from("sites")
        .select("id, organization_id")
        .eq("subdomain", SUBDOMAIN)
        .maybeSingle();

    if (error || !data) {
        throw new Error(`Sito "${SUBDOMAIN}" non trovato: ${error?.message}`);
    }
    return { siteId: data.id as string, organizationId: data.organization_id as string };
}

/* ------------------------------------------------------------------ */
/* 1. Schede prodotto tedesche con immagini reali                      */
/* ------------------------------------------------------------------ */

type ProductUpdate = {
    internal_code: string;
    name: string;
    type: string;
    description: string;
    imageFile?: string;
};

const PRODUCT_UPDATES: ProductUpdate[] = [
    {
        internal_code: "TAN-SCA-U-L",
        name: "Haarnadel Wärmeübertrager – Lange Ausführung",
        type: "Wärmeübertrager",
        description:
            "Haarnadel-Wärmeübertrager aus Tantal, lange Ausführung. Für hochkorrosive Medien in der chemischen und pharmazeutischen Industrie.",
        imageFile: "Haarnadel_Warm_Lang-5a82c198-766e-4c42-a492-adf1b6b99078.png",
    },
    {
        internal_code: "TAN-SCA-U-C",
        name: "Haarnadel Wärmeübertrager – Kurze Ausführung",
        type: "Wärmeübertrager",
        description:
            "Haarnadel-Wärmeübertrager aus Tantal, kurze Ausführung. Kompakte Bauform für begrenzte Platzverhältnisse.",
        imageFile: "Haarnadel_Wa_rm_Kurz-6e0e19c1-c9b1-4911-9575-39c367055930.png",
    },
    {
        internal_code: "TAN-CAN-V",
        name: "Vertikale Heizkerzen Ausführung",
        type: "Heizkerzen",
        description:
            "Heizkerzen aus Tantal in vertikaler Ausführung für den direkten Einbau in emaillierte Apparate.",
        imageFile: "Vertikale_Heizkerzen-e34fa113-24e8-4ea7-a22d-c8ca423f9086.png",
    },
    {
        internal_code: "TAN-CAN-O",
        name: "Horizontale Heizkerzen Ausführung",
        type: "Heizkerzen",
        description:
            "Heizkerzen aus Tantal in horizontaler Ausführung für seitlichen Einbau.",
        imageFile: "Horizontale_Heizkerzen_Ausfu_rung-187325b7-4754-41ee-a036-1aa645a4da0b.png",
    },
    {
        internal_code: "TAN-BAI-O",
        name: "Horizontale Heizkerzen Ausführung mit stahlemaillierter Estrella Kolonne",
        type: "Heizkerzen",
        description:
            "Horizontale Heizkerzen aus Tantal kombiniert mit stahlemaillierter Estrella Kolonne DN800 – komplette, abgeschlossene Einheit.",
        imageFile: "Abgeschlossene_Kolonne-b65e774e-87fe-461d-ba44-53199a74f773.png",
    },
    {
        internal_code: "COL-DN800",
        name: "Stahlemaillierte Estrella Kolonne DN800",
        type: "Kolonnen",
        description:
            "Stahlemaillierte Estrella Kolonnensektion Durchmesser DN800 mit Heizkerzen-Anschlüssen.",
        imageFile: "Kolonne_DN800-2d81dcdc-e6f8-4764-90b1-70d40b1d5318.png",
    },
];

async function uploadProductImage(siteId: string, fileName: string): Promise<string> {
    const filePath = join(ASSETS_DIR, fileName);
    const buffer = readFileSync(filePath);
    const storagePath = `${siteId}/sell-products/images/${fileName}`;

    const { error } = await supabase.storage
        .from("documents")
        .upload(storagePath, buffer, {
            contentType: "image/png",
            cacheControl: "3600",
            upsert: true,
        });

    if (error) {
        throw new Error(`Upload ${fileName}: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(storagePath);

    return publicUrl;
}

async function updateGermanProducts(siteId: string) {
    for (const product of PRODUCT_UPDATES) {
        const update: Record<string, unknown> = {
            name: product.name,
            type: product.type,
            subcategory: product.type,
            description: product.description,
        };

        if (product.imageFile) {
            update.image_url = await uploadProductImage(siteId, product.imageFile);
        }

        const { error } = await supabase
            .from("SellProduct")
            .update(update)
            .eq("site_id", siteId)
            .eq("internal_code", product.internal_code);

        if (error) {
            throw new Error(`SellProduct ${product.internal_code}: ${error.message}`);
        }
    }
    console.log(`✓ ${PRODUCT_UPDATES.length} schede prodotto aggiornate (nomi DE + immagini)`);
}

/* ------------------------------------------------------------------ */
/* 2. Tubi rivestiti in vetro (Glasbeschichtete Rohre)                 */
/* ------------------------------------------------------------------ */

const PIPE_CATEGORY = { name: "Glasbeschichtete Rohre", color: "#0EA5E9" };

const PIPE_PRODUCTS = [
    {
        internal_code: "GBR-GERADE",
        name: "Glasbeschichtetes Rohr – Gerade Ausführung",
        type: "Rohre",
        description:
            "Glasbeschichtetes gerades Rohr für korrosive Medien. Durchmesser und Länge nach Kundenspezifikation definierbar.",
        diameter_mm: 100,
        length_mm: 2000,
    },
    {
        internal_code: "GBR-L",
        name: "Glasbeschichtetes Rohr – L-Form (90°)",
        type: "Rohre",
        description:
            "Glasbeschichtetes Rohr in L-Form (90°-Bogen). Durchmesser und Länge nach Kundenspezifikation definierbar.",
        diameter_mm: 100,
        length_mm: 1000,
    },
    {
        internal_code: "GBR-T",
        name: "Glasbeschichtetes Rohr – T-Form",
        type: "Rohre",
        description:
            "Glasbeschichtetes Rohr in T-Form (Abzweigstück). Durchmesser und Länge nach Kundenspezifikation definierbar.",
        diameter_mm: 100,
        length_mm: 1000,
    },
];

async function ensurePipeProducts(siteId: string) {
    let categoryId: number;
    const { data: existingCat } = await supabase
        .from("sellproduct_categories")
        .select("id")
        .eq("site_id", siteId)
        .eq("name", PIPE_CATEGORY.name)
        .maybeSingle();

    if (existingCat) {
        categoryId = existingCat.id;
    } else {
        const { data: created, error } = await supabase
            .from("sellproduct_categories")
            .insert({ site_id: siteId, name: PIPE_CATEGORY.name, color: PIPE_CATEGORY.color })
            .select("id")
            .single();
        if (error || !created) {
            throw new Error(`sellproduct_categories ${PIPE_CATEGORY.name}: ${error?.message}`);
        }
        categoryId = created.id;
    }

    let createdCount = 0;
    for (const product of PIPE_PRODUCTS) {
        const { data: existing } = await supabase
            .from("SellProduct")
            .select("id")
            .eq("site_id", siteId)
            .eq("internal_code", product.internal_code)
            .maybeSingle();

        if (existing) {
            const { error } = await supabase
                .from("SellProduct")
                .update({
                    name: product.name,
                    type: product.type,
                    subcategory: product.type,
                    description: product.description,
                    diameter_mm: product.diameter_mm,
                    length_mm: product.length_mm,
                    category_id: categoryId,
                })
                .eq("id", existing.id);
            if (error) throw new Error(`SellProduct ${product.internal_code}: ${error.message}`);
            continue;
        }

        const { error } = await supabase.from("SellProduct").insert({
            site_id: siteId,
            name: product.name,
            type: product.type,
            subcategory: product.type,
            description: product.description,
            diameter_mm: product.diameter_mm,
            length_mm: product.length_mm,
            category_id: categoryId,
            internal_code: product.internal_code,
            active: true,
            price_list: true,
        });
        if (error) throw new Error(`SellProduct ${product.internal_code}: ${error.message}`);
        createdCount++;
    }

    console.log(`✓ Categoria "${PIPE_CATEGORY.name}" con ${PIPE_PRODUCTS.length} schede tubi (${createdCount} nuove)`);
}

/* ------------------------------------------------------------------ */
/* 3. Traduzione titoli progetti esistenti + arricchimento             */
/* ------------------------------------------------------------------ */

type TaskEnrichment = {
    title: string;
    productCode?: string;
    deliveryInDays?: number;
    percentStatus?: number;
};

const EXISTING_TASKS_DE: Record<string, TaskEnrichment> = {
    "OFF-2026-001": { title: "Emaillierter Reaktor 16'000 L Basel Chemie", productCode: "APP-SER-16000", deliveryInDays: 60, percentStatus: 25 },
    "OFF-2026-002": { title: "Emaillierte Kolonne DN1200 Rheintal Pharma", productCode: "COL-DN1200", deliveryInDays: 75, percentStatus: 15 },
    "OFF-2026-003": { title: "Haarnadel Wärmeübertrager Helvetia Fine Chemicals", productCode: "TAN-SCA-U-L", deliveryInDays: 45, percentStatus: 30 },
    "OFF-2026-004": { title: "Emaillierte Rohrleitungen R2 Rhein-Neckar Chemie", productCode: "TUB-R2", deliveryInDays: 40, percentStatus: 20 },
    "OFF-2026-005": { title: "Tantal-Heizkerzen Provence Chimie", productCode: "TAN-CAN-V", deliveryInDays: 55, percentStatus: 15 },
    "OFF-2026-006": { title: "Reemaillierung Behälter Alpine Specialty Coatings", productCode: "RIS-APP-01", deliveryInDays: 35, percentStatus: 10 },
    "OFF-2026-007": { title: "Emaillierter Reaktor 25'000 L Danube Process", productCode: "APP-REA-25000", deliveryInDays: 90, percentStatus: 100 },
    "AVO-2026-001": { title: "AVOR emaillierter Reaktor Basel Chemie", productCode: "APP-SER-16000", deliveryInDays: 55, percentStatus: 35 },
    "AVO-2026-002": { title: "AVOR Haarnadel Wärmeübertrager Helvetia", productCode: "TAN-SCA-U-L", deliveryInDays: 40, percentStatus: 45 },
    "AVO-2026-003": { title: "AVOR Kolonne DN2000 Danube Process", productCode: "COL-DN2000", deliveryInDays: 70, percentStatus: 60 },
    "AVO-2026-004": { title: "AVOR Rohrleitungen R2 Rhein-Neckar", productCode: "TUB-R2", deliveryInDays: 35, percentStatus: 15 },
    "PRO-2026-001": { title: "Emaillierter Behälter 16'000 L – Produktion", productCode: "APP-SER-16000", deliveryInDays: 30, percentStatus: 40 },
    "PRO-2026-002": { title: "Emaillierter Abscheider Léman Biotech", productCode: "APP-SEP-01", deliveryInDays: 25, percentStatus: 55 },
    "PRO-2026-003": { title: "Emaillierter Reaktor 25'000 L Danube", productCode: "APP-REA-25000", deliveryInDays: 50, percentStatus: 65 },
    "PRO-2026-004": { title: "Emaillierte Drucknutsche Zürich Surface", productCode: "APP-FIL-01", deliveryInDays: 12, percentStatus: 85 },
    "PRO-2026-005": { title: "Emaillierte Kolonne DN1200 Rheintal Pharma", productCode: "COL-DN1200", deliveryInDays: 45, percentStatus: 35 },
    "PRO-2026-006": { title: "Emaillierte Kolonne DN2000 Danube", productCode: "COL-DN2000", deliveryInDays: 60, percentStatus: 50 },
    "PRO-2026-007": { title: "Rohrleitungen R2 Rhein-Neckar Chemie", productCode: "TUB-R2", deliveryInDays: 20, percentStatus: 60 },
    "PRO-2026-008": { title: "Emaillierte Rohrleitungen Provence Chimie", productCode: "TUB-DN100", deliveryInDays: 30, percentStatus: 20 },
    "PRO-2026-009": { title: "Haarnadel Wärmeübertrager Helvetia", productCode: "TAN-SCA-U-L", deliveryInDays: 35, percentStatus: 55 },
    "PRO-2026-010": { title: "Haarnadel Wärmeübertrager (kurz) Sankt Gallen", productCode: "TAN-SCA-U-C", deliveryInDays: 42, percentStatus: 45 },
    "PRO-2026-011": { title: "Tantal-Heizkerzen Provence Chimie", productCode: "TAN-CAN-V", deliveryInDays: 38, percentStatus: 50 },
    "PRO-2026-012": { title: "Bajonett-Heizer Léman Biotech", productCode: "TAN-BAI-O", deliveryInDays: 48, percentStatus: 15 },
    "SER-2026-001": { title: "Reemaillierung Behälter Alpine Specialty Coatings", productCode: "RIS-APP-01", deliveryInDays: 28, percentStatus: 30 },
};

async function loadProductIdsByCode(siteId: string): Promise<Map<string, number>> {
    const { data, error } = await supabase
        .from("SellProduct")
        .select("id, internal_code")
        .eq("site_id", siteId);

    if (error) throw new Error(`SellProduct select: ${error.message}`);

    const map = new Map<string, number>();
    for (const row of data || []) {
        if (row.internal_code) map.set(row.internal_code, row.id);
    }
    return map;
}

async function translateAndEnrichExistingTasks(
    siteId: string,
    productIdsByCode: Map<string, number>,
    collaboratorIds: number[],
) {
    let updated = 0;
    let index = 0;

    for (const [code, enrichment] of Object.entries(EXISTING_TASKS_DE)) {
        const assigned = collaboratorIds.length
            ? [
                collaboratorIds[index % collaboratorIds.length],
                collaboratorIds[(index + 3) % collaboratorIds.length],
            ]
            : [];
        index++;

        const update: Record<string, unknown> = {
            title: enrichment.title,
            name: enrichment.title,
        };

        if (enrichment.productCode && productIdsByCode.has(enrichment.productCode)) {
            update.sellProductId = productIdsByCode.get(enrichment.productCode);
        }
        if (enrichment.deliveryInDays != null) {
            update.deliveryDate = daysFromNow(enrichment.deliveryInDays);
        }
        if (enrichment.percentStatus != null) {
            update.percentStatus = enrichment.percentStatus;
        }
        if (assigned.length) {
            update.assigned_collaborator_ids = assigned;
        }
        if (code.startsWith("OFF-")) {
            update.offer_send_date = daysFromNow(-((index % 6) + 1));
        }

        const { error, count } = await supabase
            .from("Task")
            .update(update, { count: "exact" })
            .eq("site_id", siteId)
            .eq("unique_code", code);

        if (error) throw new Error(`Task ${code}: ${error.message}`);
        if (count) updated += count;
    }

    console.log(`✓ ${updated} progetti esistenti tradotti e arricchiti`);
}

/* ------------------------------------------------------------------ */
/* 4. Clienti internazionali aggiuntivi                                */
/* ------------------------------------------------------------------ */

const NEW_CLIENTS = [
    {
        code: "EST-011",
        clientType: "BUSINESS",
        businessName: "Brookfield Process Systems Inc.",
        email: "purchasing@brookfieldprocess.com",
        city: "Brookfield",
        address: "355 Federal Road",
        zipCode: 6804,
        countryCode: "US",
        landlinePhone: "+1 215 368 9299",
    },
    {
        code: "EST-012",
        clientType: "BUSINESS",
        businessName: "Suzhou Fine Chemical Co. Ltd.",
        email: "sourcing@suzhoufinechem.cn",
        city: "Suzhou",
        address: "MuXuDong Road, Jangqiao Industry Park",
        zipCode: 215000,
        countryCode: "CN",
        landlinePhone: "+86 512 6788 912",
    },
    {
        code: "EST-013",
        clientType: "BUSINESS",
        businessName: "Kraków Chemia Procesowa Sp. z o.o.",
        email: "zakupy@krakowchemia.pl",
        city: "Kraków",
        address: "ul. Pasternik 94A",
        zipCode: 31354,
        countryCode: "PL",
        landlinePhone: "+48 12 632 81 41",
    },
];

async function ensureNewClients(siteId: string, organizationId: string): Promise<Map<string, number>> {
    const idsByCode = new Map<string, number>();

    const { data: existingClients, error } = await supabase
        .from("Client")
        .select("id, code")
        .eq("site_id", siteId);

    if (error) throw new Error(`Client select: ${error.message}`);
    for (const client of existingClients || []) {
        if (client.code) idsByCode.set(client.code, client.id);
    }

    for (const client of NEW_CLIENTS) {
        if (idsByCode.has(client.code)) continue;

        const { data: created, error: insertError } = await supabase
            .from("Client")
            .insert({ ...client, site_id: siteId, organization_id: organizationId, contactPeople: [] })
            .select("id")
            .single();

        if (insertError || !created) {
            throw new Error(`Client ${client.code}: ${insertError?.message}`);
        }
        idsByCode.set(client.code, created.id);
    }

    console.log(`✓ Clienti pronti (${idsByCode.size} totali, ${NEW_CLIENTS.length} internazionali garantiti)`);
    return idsByCode;
}

/* ------------------------------------------------------------------ */
/* 5. Nuovi progetti demo                                              */
/* ------------------------------------------------------------------ */

type NewTaskDef = {
    unique_code: string;
    title: string;
    task_type: "OFFERTA" | "LAVORO";
    clientCode: string;
    kanbanIdentifier: string;
    columnBase: string;
    sellPrice: number;
    productCode: string;
    quantity?: number;
    deliveryInDays: number;
    percentStatus: number;
    offerSendDaysAgo?: number;
};

const NEW_TASKS: NewTaskDef[] = [
    // Offerte
    { unique_code: "OFF-2026-008", title: "Glasbeschichtete Rohre DN150 Brookfield Process", task_type: "OFFERTA", clientCode: "EST-011", kanbanIdentifier: "0_offerte", columnBase: "elaborazione_0_offerte", sellPrice: 38500, productCode: "GBR-GERADE", quantity: 24, deliveryInDays: 65, percentStatus: 10, offerSendDaysAgo: 2 },
    { unique_code: "OFF-2026-009", title: "Haarnadel Wärmeübertrager (kurz) Suzhou Fine Chemical", task_type: "OFFERTA", clientCode: "EST-012", kanbanIdentifier: "0_offerte", columnBase: "trattativa_0_offerte", sellPrice: 66200, productCode: "TAN-SCA-U-C", quantity: 1, deliveryInDays: 80, percentStatus: 20, offerSendDaysAgo: 6 },
    { unique_code: "OFF-2026-010", title: "Stahlemaillierte Kolonne DN800 Kraków Chemia", task_type: "OFFERTA", clientCode: "EST-013", kanbanIdentifier: "0_offerte", columnBase: "inviata_0_offerte", sellPrice: 84000, productCode: "COL-DN800", quantity: 1, deliveryInDays: 95, percentStatus: 10, offerSendDaysAgo: 4 },
    { unique_code: "OFF-2026-011", title: "T-Rohre glasbeschichtet Basel Chemie", task_type: "OFFERTA", clientCode: "EST-001", kanbanIdentifier: "0_offerte", columnBase: "elaborazione_0_offerte", sellPrice: 21800, productCode: "GBR-T", quantity: 16, deliveryInDays: 50, percentStatus: 10, offerSendDaysAgo: 1 },
    // AVOR
    { unique_code: "AVO-2026-005", title: "AVOR Heizkerzen mit Estrella Kolonne Rheintal Pharma", task_type: "LAVORO", clientCode: "EST-002", kanbanIdentifier: "1_avor", columnBase: "elaborazione_1_avor", sellPrice: 118000, productCode: "TAN-BAI-O", quantity: 1, deliveryInDays: 58, percentStatus: 40 },
    { unique_code: "AVO-2026-006", title: "AVOR glasbeschichtete Rohre Brookfield Process", task_type: "LAVORO", clientCode: "EST-011", kanbanIdentifier: "1_avor", columnBase: "rilievo_1_avor", sellPrice: 38500, productCode: "GBR-GERADE", quantity: 24, deliveryInDays: 60, percentStatus: 25 },
    // Produzione
    { unique_code: "PRO-2026-013", title: "Stahlemaillierte Kolonne DN800 Kraków Chemia", task_type: "LAVORO", clientCode: "EST-013", kanbanIdentifier: "colonne", columnBase: "fabbricazione_colonne", sellPrice: 84000, productCode: "COL-DN800", quantity: 1, deliveryInDays: 85, percentStatus: 30 },
    { unique_code: "PRO-2026-014", title: "Horizontale Heizkerzen Suzhou Fine Chemical", task_type: "LAVORO", clientCode: "EST-012", kanbanIdentifier: "elementi", columnBase: "assemblaggio_elementi", sellPrice: 47300, productCode: "TAN-CAN-O", quantity: 2, deliveryInDays: 32, percentStatus: 65 },
    { unique_code: "PRO-2026-015", title: "Gerade Rohre glasbeschichtet Sankt Gallen Pharmatech", task_type: "LAVORO", clientCode: "EST-010", kanbanIdentifier: "tubazioni", columnBase: "smaltatura_tubazioni", sellPrice: 29600, productCode: "GBR-GERADE", quantity: 18, deliveryInDays: 22, percentStatus: 70 },
    { unique_code: "PRO-2026-016", title: "L-Rohre glasbeschichtet Zürich Surface Technology", task_type: "LAVORO", clientCode: "EST-008", kanbanIdentifier: "tubazioni", columnBase: "taglio_tubazioni", sellPrice: 17400, productCode: "GBR-L", quantity: 12, deliveryInDays: 40, percentStatus: 25 },
    { unique_code: "PRO-2026-017", title: "Haarnadel Wärmeübertrager (lang) Brookfield Process", task_type: "LAVORO", clientCode: "EST-011", kanbanIdentifier: "scambiatori", columnBase: "fabbricazione_scambiatori", sellPrice: 96500, productCode: "TAN-SCA-U-L", quantity: 1, deliveryInDays: 68, percentStatus: 35 },
    { unique_code: "PRO-2026-018", title: "Vertikale Heizkerzen Helvetia Fine Chemicals", task_type: "LAVORO", clientCode: "EST-003", kanbanIdentifier: "elementi", columnBase: "controllo_elementi", sellPrice: 52800, productCode: "TAN-CAN-V", quantity: 3, deliveryInDays: 10, percentStatus: 90 },
];

async function getKanbanId(siteId: string, identifier: string): Promise<number> {
    const { data, error } = await supabase
        .from("Kanban")
        .select("id")
        .eq("site_id", siteId)
        .eq("identifier", identifier)
        .maybeSingle();

    if (error || !data) throw new Error(`Kanban ${identifier} non trovato`);
    return data.id;
}

async function getColumnId(kanbanId: number, baseIdentifier: string): Promise<number> {
    const { data } = await supabase
        .from("KanbanColumn")
        .select("id")
        .eq("kanbanId", kanbanId)
        .eq("identifier", scopedColumnIdentifier(baseIdentifier))
        .maybeSingle();

    if (!data) throw new Error(`Colonna mancante: ${baseIdentifier}`);
    return data.id;
}

async function ensureNewTasks(
    siteId: string,
    clientIdsByCode: Map<string, number>,
    productIdsByCode: Map<string, number>,
    collaboratorIds: number[],
) {
    let createdCount = 0;
    let index = 0;

    for (const task of NEW_TASKS) {
        index++;
        const { data: existing } = await supabase
            .from("Task")
            .select("id")
            .eq("site_id", siteId)
            .eq("unique_code", task.unique_code)
            .maybeSingle();

        if (existing) continue;

        const clientId = clientIdsByCode.get(task.clientCode);
        if (!clientId) throw new Error(`Cliente ${task.clientCode} non trovato`);

        const productId = productIdsByCode.get(task.productCode) ?? null;
        const kanbanId = await getKanbanId(siteId, task.kanbanIdentifier);
        const columnId = await getColumnId(kanbanId, task.columnBase);

        const assigned = collaboratorIds.length
            ? [
                collaboratorIds[index % collaboratorIds.length],
                collaboratorIds[(index + 5) % collaboratorIds.length],
            ]
            : [];

        const quantity = task.quantity ?? 1;
        const unitPrice = Math.round(task.sellPrice / quantity);

        const insert: Record<string, unknown> = {
            unique_code: task.unique_code,
            title: task.title,
            name: task.title,
            task_type: task.task_type,
            site_id: siteId,
            clientId,
            kanbanId,
            kanbanColumnId: columnId,
            column_id: columnId,
            column_position: 10 + index,
            sellPrice: task.sellPrice,
            sellProductId: productId,
            deliveryDate: daysFromNow(task.deliveryInDays),
            percentStatus: task.percentStatus,
            status: "open",
            material: task.task_type === "LAVORO",
            ferramenta: false,
            metalli: true,
            legno: false,
            assigned_collaborator_ids: assigned,
            offer_products: productId
                ? [
                    {
                        productId,
                        productName: task.title,
                        description: null,
                        quantity,
                        unitPrice,
                        totalPrice: quantity * unitPrice,
                    },
                ]
                : [],
        };

        if (task.offerSendDaysAgo != null) {
            insert.offer_send_date = daysFromNow(-task.offerSendDaysAgo);
        }

        const { error } = await supabase.from("Task").insert(insert);
        if (error) throw new Error(`Task ${task.unique_code}: ${error.message}`);
        createdCount++;
    }

    console.log(`✓ ${NEW_TASKS.length} nuovi progetti (${createdCount} creati ora)`);
}

/* ------------------------------------------------------------------ */
/* 6. Collaboratori demo: id interni + presenze                        */
/* ------------------------------------------------------------------ */

async function loadDemoCollaborators(siteId: string): Promise<{
    internalIds: number[];
    authIds: string[];
}> {
    const { data: userSites, error } = await supabase
        .from("user_sites")
        .select("user_id")
        .eq("site_id", siteId);

    if (error) throw new Error(`user_sites: ${error.message}`);

    const authIds = (userSites || []).map((entry) => entry.user_id);
    if (!authIds.length) return { internalIds: [], authIds: [] };

    const { data: users, error: usersError } = await supabase
        .from("User")
        .select("id, authId, auth_id, role, email")
        .or(
            `authId.in.(${authIds.join(",")}),auth_id.in.(${authIds.join(",")})`,
        );

    if (usersError) throw new Error(`User: ${usersError.message}`);

    const collaborators = (users || []).filter(
        (user) =>
            user.role !== "superadmin" &&
            typeof user.email === "string" &&
            user.email.endsWith("@estrella.ch"),
    );

    return {
        internalIds: collaborators.map((user) => user.id),
        authIds: collaborators
            .map((user) => user.authId || user.auth_id)
            .filter(Boolean) as string[],
    };
}

const ATTENDANCE_SPECIALS: Array<{ status: string; every: number; offset: number }> = [
    { status: "vacanze", every: 11, offset: 3 },
    { status: "malattia", every: 17, offset: 7 },
    { status: "formazione", every: 13, offset: 5 },
    { status: "assenza_privata", every: 19, offset: 11 },
];

function statusFor(userIndex: number, dayOfMonth: number): string {
    for (const special of ATTENDANCE_SPECIALS) {
        if ((dayOfMonth + userIndex * special.offset) % special.every === 0) {
            return special.status;
        }
    }
    return "presente";
}

async function seedAttendance(siteId: string, authIds: string[]) {
    if (!authIds.length) {
        console.log("↷ Nessun collaboratore per presenze");
        return;
    }

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const rows: Array<Record<string, unknown>> = [];
    for (let userIndex = 0; userIndex < authIds.length; userIndex++) {
        const cursor = new Date(start);
        while (cursor <= today) {
            const dayOfWeek = cursor.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                rows.push({
                    site_id: siteId,
                    user_id: authIds[userIndex],
                    date: cursor.toISOString().split("T")[0],
                    status: statusFor(userIndex, cursor.getDate()),
                    auto_detected: false,
                });
            }
            cursor.setDate(cursor.getDate() + 1);
        }
    }

    // Upsert a blocchi per evitare payload troppo grandi
    const chunkSize = 400;
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase
            .from("attendance_entries")
            .upsert(chunk, { onConflict: "site_id,user_id,date", ignoreDuplicates: true });
        if (error) throw new Error(`attendance_entries: ${error.message}`);
    }

    console.log(`✓ Presenze demo per ${authIds.length} collaboratori (${rows.length} giorni)`);

    // Alcune richieste ferie per il pannello
    const leaveRequests = [
        {
            user_id: authIds[0],
            leave_type: "vacanze",
            startInDays: 14,
            days: 5,
            notes: "Sommerferien",
            status: "pending",
        },
        {
            user_id: authIds[1 % authIds.length],
            leave_type: "formazione",
            startInDays: 7,
            days: 2,
            notes: "Schweisskurs Tantal",
            status: "pending",
        },
        {
            user_id: authIds[2 % authIds.length],
            leave_type: "vacanze",
            startInDays: -20,
            days: 3,
            notes: null,
            status: "approved",
        },
    ];

    for (const request of leaveRequests) {
        const startDate = daysFromNow(request.startInDays).split("T")[0];
        const endDate = daysFromNow(request.startInDays + request.days - 1).split("T")[0];

        const { data: existing } = await supabase
            .from("leave_requests")
            .select("id")
            .eq("site_id", siteId)
            .eq("user_id", request.user_id)
            .eq("start_date", startDate)
            .maybeSingle();

        if (existing) continue;

        const { error } = await supabase.from("leave_requests").insert({
            site_id: siteId,
            user_id: request.user_id,
            leave_type: request.leave_type,
            start_date: startDate,
            end_date: endDate,
            notes: request.notes,
            status: request.status,
        });
        if (error) throw new Error(`leave_requests: ${error.message}`);
    }

    console.log(`✓ ${leaveRequests.length} richieste ferie demo`);
}

/* ------------------------------------------------------------------ */
/* 7. Moduli sito (attendance + resellers)                             */
/* ------------------------------------------------------------------ */

async function enableModules(siteId: string) {
    const modules = ["attendance", "resellers"];
    for (const moduleName of modules) {
        const { error } = await supabase.from("site_modules").upsert(
            {
                site_id: siteId,
                module_name: moduleName,
                is_enabled: true,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "site_id,module_name" },
        );
        if (error) throw new Error(`site_modules ${moduleName}: ${error.message}`);
    }
    console.log(`✓ Moduli abilitati: ${modules.join(", ")}`);
}

/* ------------------------------------------------------------------ */
/* 8. Rivenditori reali per paese                                      */
/* ------------------------------------------------------------------ */

type ResellerDef = {
    country: string;
    country_code: string;
    name: string;
    contact_person?: string;
    address?: string;
    zip_city?: string;
    phone?: string;
    fax?: string;
    mobile?: string;
    email?: string;
    website?: string;
};

const ORILING = {
    name: "AB Oriling Lindberg Ingenjörsbyra",
    address: "Duvnäsgatan 12",
    zip_city: "S-11634 Stockholm",
    phone: "+46 8641 35 30",
    fax: "+46 8641 46 10",
};

const IMI = {
    name: "IMI InProTec Pte Ltd.",
    contact_person: "Michael Wolf",
    address: "N°.1 Springside Drive",
    zip_city: "786980 Singapore",
    phone: "+65 6452 4324",
    fax: "+65 6452 6924",
    mobile: "+65 9664 4858",
    email: "michael.wolf@imiww.com",
    website: "www.iniww.com",
};

const RESELLERS: ResellerDef[] = [
    {
        country: "Spanien",
        country_code: "ES",
        name: "Ige ingenieros sl",
        contact_person: "Pablo Gibert",
        address: "Dr. Roux 123 bajos",
        zip_city: "08017 Barcelona",
        phone: "+34 932 037 666",
        fax: "+34 932 038 721",
        email: "pge@ige.es",
        website: "www.ige.es",
    },
    { country: "Schweden", country_code: "SE", ...ORILING },
    { country: "Norwegen", country_code: "NO", ...ORILING },
    { country: "Finnland", country_code: "FI", ...ORILING },
    { country: "Thailand", country_code: "TH", ...IMI },
    { country: "Indonesien", country_code: "ID", ...IMI },
    { country: "Malaysia", country_code: "MY", ...IMI },
    { country: "Singapur", country_code: "SG", ...IMI },
    {
        country: "Türkei",
        country_code: "TR",
        name: "Pen-Tas Kimya Ticaret ve Sanayi Ltd.",
        address: "Kuleli Sokak, N°:75-11",
        zip_city: "06700 G.O.P., Ankara",
        phone: "+90 312 448 03 35",
        fax: "+90 312 448 03 45",
        mobile: "+90 532 276 78 07",
        email: "info@pen-tas.com",
        website: "www.pen-tas.com",
    },
    {
        country: "Ungarn",
        country_code: "HU",
        name: "Sealorient Kereskedelmi és szerviz KFT",
        address: "Szechenyi utca 30.",
        zip_city: "1174 Budapest",
        phone: "+36 1 258 4332",
        fax: "+36 1 259 1645",
        email: "sealorient@axelero.hu",
    },
    {
        country: "Indien",
        country_code: "IN",
        name: "MAS Sealing Systems (P) Ltd.",
        address: "251, 5/B, Mittal Industrial Estate, Marol, Andheri (East)",
        zip_city: "Mumbai 400 059",
        phone: "+91 22 2850 1805",
        fax: "+91 22 2856 0312",
        website: "www.masseal.com",
    },
    {
        country: "Israel",
        country_code: "IL",
        name: "Petrus Technical Supplies Ltd.",
        contact_person: "Zeev",
        address: "60 Medinat Hayehudim St., P.O.B. 2056",
        zip_city: "Herzlia 46766",
        phone: "+972 9958 7670",
        fax: "+972 9958 7726",
        email: "zeev@petrus.co.il",
    },
    {
        country: "Italien",
        country_code: "IT",
        name: "FluorTecno",
        address: "Via delle Imprese, 34",
        zip_city: "I-24041 Brembate (BG)",
        phone: "+39 35 487 4077",
        fax: "+39 35 487 4078",
        website: "www.guastallo.com",
    },
    {
        country: "Jordanien",
        country_code: "JO",
        name: "Ramallah Engineering & Chemical Est.",
        contact_person: "Hanna Hanania",
        address: "P.O. Box 925682",
        zip_city: "Amman 11190",
        phone: "+962 6 5538256",
        fax: "+962 6 5518257",
        email: "h.hanania@ramallahEngineering.com",
        website: "www.ramallahEngineering.com",
    },
    {
        country: "Polen",
        country_code: "PL",
        name: "Tessa Wolff i Synowie sp.j.",
        contact_person: "A. Wolff",
        address: "ul. Pasternik 94A",
        zip_city: "31-354 Kraków",
        phone: "+48 12 632 81 41",
        mobile: "+48 60 233 23 00",
        email: "a.wolff@tessa.eu",
        website: "www.tessa.eu",
    },
    {
        country: "Katar",
        country_code: "QA",
        name: "Shotec-Gulf",
        contact_person: "Ahmed Magdy",
        address: "Street 4 Wekalat Road, Mars Building, Industrial Area",
        zip_city: "Doha",
        phone: "+974 55513097",
        fax: "+974 4167895",
        email: "ahmed.magdy@shotec-gulf.com",
        website: "www.shotec-gulf.com",
    },
    {
        country: "Südkorea",
        country_code: "KR",
        name: "Well Corporation (Koea Glass Systems)",
        address: "3Fl. 57 PheongChon-Dong, DongAn-Gu, AnYan-City, GyeongGi-Do",
        zip_city: "Seoul 431-070",
        phone: "+82 31 4265316",
        fax: "+82 31 4265317",
        email: "wellcorp@wellcorp.co.kr",
        website: "www.wellcorp.co.kr",
    },
    {
        country: "Frankreich",
        country_code: "FR",
        name: "Vettorazzo AC Industrie",
        contact_person: "Michel Vettorazzo",
        address: "30, rue de la Compagnie du Capitaine Jacky Thomas",
        zip_city: "F-56370 Sarzeau",
        phone: "+33 662 469 485",
        email: "michel.vettorazzo@orange.fr",
    },
    {
        country: "USA / Kanada",
        country_code: "US",
        name: "Estrella USA, Inc.",
        address: "355 Federal Road Ste 1A",
        zip_city: "Brookfield, CT 06804",
        phone: "+1 215-368-9299",
        website: "www.estrella-usa.com",
    },
    {
        country: "Belgien",
        country_code: "BE",
        name: "Equipex",
        address: "Lange Wolstraat 3",
        zip_city: "4524 CA Sluis (NL)",
        phone: "+31 117 420166/68",
        fax: "+31 117 420167",
        mobile: "+31 6 51414017",
        email: "equipex@xs4all.nl",
    },
    {
        country: "China",
        country_code: "CN",
        name: "Suzhou Kolon Chemical Equipment Co. Ltd.",
        contact_person: "Justin",
        address: "Workshop E7, Block 25, Jangqiao Industry Park, MuXuDong Road",
        zip_city: "Suzhou City",
        phone: "+86 512 6788912",
        fax: "+86 512 67688902",
        mobile: "+86 150 50177727",
        email: "justin@szkolon.com",
    },
    {
        country: "Grossbritannien / Irland",
        country_code: "GB",
        name: "Pegler & Louden Ireland, a Division of BSS (Ireland) Ltd.",
        contact_person: "Pat Kelly, Sales Director",
        address: "White Heather Ind. Estate, 301 South Circular Road",
        zip_city: "Dublin 8",
        phone: "+353 (1) 4165170",
        fax: "+353 (1) 4165175",
        email: "pkelly@pli.ie",
        website: "www.pli.ie / www.bssireland.ie",
    },
];

async function ensureResellers(siteId: string) {
    let createdCount = 0;

    for (const reseller of RESELLERS) {
        const { data: existing } = await supabase
            .from("Reseller")
            .select("id")
            .eq("site_id", siteId)
            .eq("name", reseller.name)
            .eq("country", reseller.country)
            .maybeSingle();

        if (existing) continue;

        const { error } = await supabase.from("Reseller").insert({
            ...reseller,
            site_id: siteId,
        });

        if (error) throw new Error(`Reseller ${reseller.country}: ${error.message}`);
        createdCount++;
    }

    console.log(`✓ ${RESELLERS.length} rivenditori (${createdCount} creati ora)`);
}

/* ------------------------------------------------------------------ */

async function main() {
    console.log("🏭 Seed demo Estrella (presentazione)\n");

    const { siteId, organizationId } = await resolveSiteId();
    console.log(`Sito: ${siteId}\n`);

    await updateGermanProducts(siteId);
    await ensurePipeProducts(siteId);

    const productIdsByCode = await loadProductIdsByCode(siteId);
    const clientIdsByCode = await ensureNewClients(siteId, organizationId);
    const { internalIds, authIds } = await loadDemoCollaborators(siteId);
    console.log(`✓ ${internalIds.length} collaboratori demo trovati`);

    await translateAndEnrichExistingTasks(siteId, productIdsByCode, internalIds);
    await ensureNewTasks(siteId, clientIdsByCode, productIdsByCode, internalIds);
    await seedAttendance(siteId, authIds);
    await enableModules(siteId);
    await ensureResellers(siteId);

    console.log("\n✅ Dati demo Estrella pronti");
}

main().catch((err) => {
    console.error("\n❌ Seed fallito:", err);
    process.exit(1);
});
