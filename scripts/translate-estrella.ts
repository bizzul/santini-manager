/**
 * One-off: traduce in tedesco i dati GIA' presenti nello spazio "Estrella"
 * (kanban, colonne, categorie kanban, categorie e prodotti) e imposta i
 * setting per-sito (lingua tedesca + nazioni evidenziate sulla mappa).
 *
 * Idempotente: usa chiavi stabili (identifier / internal_code / nome
 * corrente) per il match; i valori gia tradotti restano invariati.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/translate-estrella.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = "estrella";

/** Nazioni delle sedi/rappresentanze Estrella (ISO 3166-1 alpha-3). */
const ESTRELLA_COUNTRIES = [
    "CHE", "FRA", "USA", "CAN", "BEL", "NLD", "CHN", "FIN", "GBR", "IRL",
    "HUN", "IND", "IDN", "ISR", "ITA", "JOR", "MYS", "NOR", "POL", "QAT",
    "SGP", "KOR", "ESP", "SWE", "THA", "TUR",
];

const CATEGORY_NAME_BY_IDENTIFIER: Record<string, string> = {
    "ufficio": "Vertrieb",
    "ufficio-tecnico": "Technisches Büro",
    "produzione": "Produktion",
    "service": "Service",
    "fatturazione": "Fakturierung",
    "interni": "Intern",
};

const KANBAN_TITLE_BY_IDENTIFIER: Record<string, string> = {
    "0_offerte": "Offerten",
    "1_avor": "AVOR",
    "apparecchi": "1. Emaillierte Apparate",
    "colonne": "2. Kolonnen",
    "tubazioni": "3. Rohrleitungsteile",
    "scambiatori": "4. Tantal-Wärmetauscher",
    "elementi": "5. Tantal-Heizelemente",
    "service": "Service",
    "fatture": "Ausgangsrechnungen",
    "diversi": "Diverses",
    "9_rd": "F&E",
    "10_spazi": "Standorte",
};

/** Traduzione colonne per titolo italiano corrente (comune a tutte le board). */
const COLUMN_TITLE_BY_ITALIAN: Record<string, string> = {
    "To do": "Zu erledigen",
    "To Do": "Zu erledigen",
    "Elaborazione": "Bearbeitung",
    "Inviata": "Gesendet",
    "Trattativa": "Verhandlung",
    "Vinta": "Gewonnen",
    "Persa": "Verloren",
    "Rilievo": "Aufmass",
    "Produzione": "Produktion",
    "Fabbricazione": "Fertigung",
    "Saldatura": "Schweissen",
    "Sabbiatura": "Sandstrahlen",
    "Smaltatura": "Emaillierung",
    "Cottura": "Brennen",
    "Collaudo": "Abnahme",
    "Spedito": "Versendet",
    "Taglio": "Zuschnitt",
    "Saldatura tantalio": "Tantal-Schweissen",
    "Assemblaggio": "Montage",
    "NDT / Controllo": "ZfP / Prüfung",
    "Lavorazione": "Bearbeitung",
    "Controllo": "Prüfung",
    "Pianificato": "Geplant",
    "Esecuzione": "Ausführung",
    "Ultimato": "Abgeschlossen",
    "Pagata": "Bezahlt",
    "Progettazione": "Konstruktion",
    "Prototipo": "Prototyp",
};

const PRODUCT_CATEGORY_BY_ITALIAN: Record<string, string> = {
    "Apparecchi smaltati": "Apparate",
    "Colonne": "Kolonnen",
    "Tubazioni": "Rohrleitungsteile",
    "Scambiatori tantalio": "Tantal-Wärmetauscher",
    "Elementi riscaldanti tantalio": "Tantal-Heizelemente",
    "Ri-smaltatura": "Reemaillierungen",
};

type ProductDe = { name: string; type: string; description: string };
const PRODUCTS_BY_CODE: Record<string, ProductDe> = {
    "APP-SER-6300": { name: "Emaillierter Behälter 6'300 L", type: "Behälter", description: "Behälter aus Stahlemail, Volumen 6'300 L" },
    "APP-SER-16000": { name: "Emaillierter Behälter 16'000 L", type: "Behälter", description: "Behälter aus Stahlemail, Volumen 16'000 L" },
    "APP-REA-25000": { name: "Emaillierter Reaktor 25'000 L", type: "Reaktoren", description: "Emaillierter Reaktor, max. Volumen 25'000 L" },
    "APP-SEP-01": { name: "Emaillierter Abscheider", type: "Abscheider", description: "Abscheider aus Stahlemail für chemische Prozesse" },
    "APP-FIL-01": { name: "Emaillierte Drucknutsche", type: "Drucknutschen", description: "Drucknutsche aus Stahlemail" },
    "COL-DN800": { name: "Emaillierte Kolonne DN800", type: "Kolonnen", description: "Emaillierte Kolonnensektion Durchmesser DN800" },
    "COL-DN1200": { name: "Emaillierte Kolonne DN1200", type: "Kolonnen", description: "Emaillierte Kolonnensektion Durchmesser DN1200" },
    "COL-DN2000": { name: "Emaillierte Kolonne DN2000", type: "Kolonnen", description: "Emaillierte Kolonnensektion Durchmesser DN2000 (max)" },
    "TUB-DN100": { name: "Emailliertes Rohr DN100", type: "Rohre", description: "Rohr aus Stahlemail DN100" },
    "TUB-R2": { name: "Rohrverbindung R2", type: "Verbindungen", description: "Rohrverbindung R2 mit minimalem Totraum (pharmazeutisch)" },
    "TUB-CUR-90": { name: "Emaillierter Bogen 90°", type: "Bögen", description: "Bogen aus Stahlemail 90°" },
    "TUB-VAL-01": { name: "Emailliertes Ventil", type: "Ventile", description: "Ventil aus Stahlemail" },
    "TAN-SCA-U-L": { name: "U-Rohrbündel-Wärmetauscher (lang)", type: "Wärmetauscher", description: "U-Rohrbündel-Wärmetauscher aus Tantal, lange Ausführung" },
    "TAN-SCA-U-C": { name: "U-Rohrbündel-Wärmetauscher (kurz)", type: "Wärmetauscher", description: "U-Rohrbündel-Wärmetauscher aus Tantal, kurze Ausführung" },
    "TAN-CAN-V": { name: "Vertikaler Heizkörper", type: "Heizelemente", description: "Heizkörper aus Tantal, vertikale Installation" },
    "TAN-CAN-O": { name: "Horizontaler Heizkörper", type: "Heizelemente", description: "Heizkörper aus Tantal, horizontale Installation" },
    "TAN-BAI-O": { name: "Horizontaler Bajonett-Heizer", type: "Zubehör", description: "Horizontaler Bajonett-Heizer aus Tantal" },
    "RIS-APP-01": { name: "Reemaillierung Apparat", type: "Dienstleistung", description: "Reemaillierung Apparat (ca. 65% des Neupreises)" },
    "RIS-COL-01": { name: "Reemaillierung Kolonne", type: "Dienstleistung", description: "Reemaillierung Kolonnensektion" },
};

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase env vars. Run with --env-file=.env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function resolveSiteId(): Promise<string> {
    const { data, error } = await supabase
        .from("sites")
        .select("id")
        .eq("subdomain", SUBDOMAIN)
        .maybeSingle();

    if (error || !data) {
        throw new Error(`Sito "${SUBDOMAIN}" non trovato: ${error?.message}`);
    }
    return data.id as string;
}

async function translateKanbanCategories(siteId: string) {
    let updated = 0;
    for (const [identifier, name] of Object.entries(CATEGORY_NAME_BY_IDENTIFIER)) {
        const { error } = await supabase
            .from("KanbanCategory")
            .update({ name })
            .eq("site_id", siteId)
            .eq("identifier", identifier);
        if (error) throw new Error(`KanbanCategory ${identifier}: ${error.message}`);
        updated++;
    }
    console.log(`✓ ${updated} categorie kanban tradotte`);
}

async function translateKanbans(siteId: string): Promise<number[]> {
    const { data: kanbans, error } = await supabase
        .from("Kanban")
        .select("id, identifier")
        .eq("site_id", siteId);
    if (error) throw new Error(`Kanban select: ${error.message}`);

    const ids: number[] = [];
    for (const kanban of kanbans ?? []) {
        ids.push(kanban.id);
        const title = KANBAN_TITLE_BY_IDENTIFIER[kanban.identifier];
        if (!title) continue;
        const { error: upErr } = await supabase
            .from("Kanban")
            .update({ title })
            .eq("id", kanban.id);
        if (upErr) throw new Error(`Kanban ${kanban.identifier}: ${upErr.message}`);
    }
    console.log(`✓ ${ids.length} kanban tradotte`);
    return ids;
}

async function translateColumns(kanbanIds: number[]) {
    if (kanbanIds.length === 0) return;
    const { data: columns, error } = await supabase
        .from("KanbanColumn")
        .select("id, title")
        .in("kanbanId", kanbanIds);
    if (error) throw new Error(`KanbanColumn select: ${error.message}`);

    let updated = 0;
    for (const col of columns ?? []) {
        const title = COLUMN_TITLE_BY_ITALIAN[col.title as string];
        if (!title || title === col.title) continue;
        const { error: upErr } = await supabase
            .from("KanbanColumn")
            .update({ title })
            .eq("id", col.id);
        if (upErr) throw new Error(`KanbanColumn ${col.id}: ${upErr.message}`);
        updated++;
    }
    console.log(`✓ ${updated} colonne kanban tradotte`);
}

async function translateProductCategories(siteId: string) {
    let updated = 0;
    for (const [italian, german] of Object.entries(PRODUCT_CATEGORY_BY_ITALIAN)) {
        const { error } = await supabase
            .from("sellproduct_categories")
            .update({ name: german })
            .eq("site_id", siteId)
            .eq("name", italian);
        if (error) throw new Error(`sellproduct_categories ${italian}: ${error.message}`);
        updated++;
    }
    console.log(`✓ categorie prodotto tradotte (${updated} mappature applicate)`);
}

async function translateProducts(siteId: string) {
    let updated = 0;
    for (const [code, de] of Object.entries(PRODUCTS_BY_CODE)) {
        const { error } = await supabase
            .from("SellProduct")
            .update({ name: de.name, type: de.type, description: de.description })
            .eq("site_id", siteId)
            .eq("internal_code", code);
        if (error) throw new Error(`SellProduct ${code}: ${error.message}`);
        updated++;
    }
    console.log(`✓ prodotti tradotti (${updated} mappature applicate)`);
}

async function setSiteSetting(siteId: string, key: string, value: unknown) {
    const { error } = await supabase.from("site_settings").upsert(
        {
            site_id: siteId,
            setting_key: key,
            setting_value: value,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "site_id,setting_key" },
    );
    if (error) throw new Error(`site_settings ${key}: ${error.message}`);
}

async function main() {
    console.log("🌍 Traduzione tedesca + setting mappa per Estrella\n");

    const siteId = await resolveSiteId();
    console.log(`Sito: ${siteId}`);

    await translateKanbanCategories(siteId);
    const kanbanIds = await translateKanbans(siteId);
    await translateColumns(kanbanIds);
    await translateProductCategories(siteId);
    await translateProducts(siteId);

    await setSiteSetting(siteId, "site_language", { locale: "de" });
    await setSiteSetting(siteId, "map_highlight_countries", ESTRELLA_COUNTRIES);
    console.log("✓ setting lingua (de) e nazioni mappa impostati");

    console.log("\n✅ Estrella tradotto in tedesco");
}

main().catch((err) => {
    console.error("\n❌ Traduzione fallita:", err);
    process.exit(1);
});
