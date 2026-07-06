/**
 * Inserisce un campione di articoli reali di magazzino nello spazio Suisseframe,
 * ricavati dal "Rapporto inventario al 7 luglio 2026.xlsx".
 *
 * Per ogni articolo crea: categoria (se manca), fornitore (se manca),
 * inventory_items + inventory_item_variants + movimento di apertura (giacenza).
 * Articoli con lo stesso nome diventano varianti dello stesso item.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-suisseframe-inventory.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
const SERVICE_KEY =
    process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBDOMAIN = "suisseframe";

type Article = {
    name: string;
    category: string;
    supplier: string;
    code: string;
    h?: number;
    l?: number;
    p?: number;
    quantity: number;
    price: number;
};

/** Campione rappresentativo (4 per categoria) dal rapporto inventario. */
const ARTICLES: Article[] = [
    // --- Legno ---
    { name: "Abete Natur DKD", category: "Legno", supplier: "Deligno", code: "118*28*2800", h: 28, l: 2800, p: 118, quantity: 3, price: 19.43 },
    { name: "Abete Lista", category: "Legno", supplier: "Stahel +Köng", code: "31*30*5000", h: 31, l: 5000, p: 38, quantity: 116, price: 17.41 },
    { name: "Abete KKK anta SF220", category: "Legno", supplier: "Deligno", code: "105*84*5000-6000", h: 84, l: 5000, p: 105, quantity: 142, price: 39.47 },
    { name: "Larice Natur", category: "Legno", supplier: "Suisse Frame", code: "200*65*4100", h: 65, l: 4100, p: 200, quantity: 6, price: 194.75 },
    // --- Utensili ---
    { name: "Coltello Conturex", category: "Utensili", supplier: "Oertli", code: "KG217050 H6", quantity: 6, price: 14.2 },
    { name: "Coltello Conturex", category: "Utensili", supplier: "Oertli", code: "KP416512", quantity: 3, price: 72.48 },
    { name: "Coltello Conturex", category: "Utensili", supplier: "Oertli", code: "KF216306", quantity: 4, price: 48.16 },
    { name: "Coltello Conturex", category: "Utensili", supplier: "Oertli", code: "KF216428", quantity: 4, price: 48.16 },
    // --- Levigatura ---
    { name: "Proteggi platorello", category: "Levigatura", supplier: "Painting", code: "8299502011", l: 133, p: 81, quantity: 5, price: 8.38 },
    { name: "Platorello Mirka DEOS", category: "Levigatura", supplier: "Painting", code: "8292353011", l: 133, p: 81, quantity: 1, price: 59.76 },
    { name: "Cera Novoryt semi-dura", category: "Levigatura", supplier: "Koch", code: "93.721.142", quantity: 0, price: 3.25 },
    { name: "Cera Novoryt morbida rovere/larice", category: "Levigatura", supplier: "Koch", code: "93.720.11", quantity: 4, price: 2.65 },
    // --- Verniciatura ---
    { name: "LA 324 IP R 7035", category: "Verniciatura", supplier: "Painting", code: "LA324IP/R7035-25", quantity: 5, price: 13.08 },
    { name: "RAL 7006 grigio", category: "Verniciatura", supplier: "Painting", code: "LA330IP/R7006-25", quantity: 15, price: 12.89 },
    { name: "Impralan Lasur MS810 Natur - 5 lt/20 lt", category: "Verniciatura", supplier: "Dynasol", code: "W7189018005/20", quantity: 5, price: 12.46 },
    { name: "LA 324 IP S7500N", category: "Verniciatura", supplier: "Painting", code: "LA324IP/S7500N", quantity: 10, price: 13.4 },
    // --- Magazzino ---
    { name: "Ronny SOFT TOUCH nero (con conchiglia)", category: "Magazzino", supplier: "Süd-Metall", code: "32.97.1500", quantity: 6, price: 111 },
    { name: "Maniglia Ronny III per finestra con viti M5x45mm", category: "Magazzino", supplier: "Süd-Metall", code: "32.86.6450", quantity: 390, price: 4.9 },
    { name: "Profilo Gutmann 134.10 RAL 9016", category: "Magazzino", supplier: "Gutmann", code: "SH F 134.10-SK", l: 6000, quantity: 4.5, price: 74.53 },
    { name: "KABA-8 mezzocilindro con 3 chiavi", category: "Magazzino", supplier: "Koch", code: "69.001.40", quantity: 1, price: 152.2 },
    // --- Materiale di consumo ---
    { name: "Viti M6 x 65 - 95 - 100", category: "Materiale di consumo", supplier: "Geiser", code: "27.080.35", quantity: 150, price: 0.74 },
    { name: "Viti 6.0 x 160 TX30 - 100 pz", category: "Materiale di consumo", supplier: "Koch", code: "92.001.6160 / 92.000.6160", quantity: 3, price: 12.34 },
    { name: "Viti M6 x 75", category: "Materiale di consumo", supplier: "Geiser", code: "27.080.33", quantity: 120, price: 0.57 },
    { name: "Viti 6,0 x 300 Astrein - 50 pz", category: "Materiale di consumo", supplier: "Immer", code: "82.1019.60300", l: 300, p: 6, quantity: 4, price: 34.66 },
    // --- Servizio ---
    { name: "Viti per montaggio finestre 7.5 x 120/152/182/212", category: "Servizio", supplier: "Koch", code: "93.167.107/.188.212/.168.215/.218/.221", p: 7.5, quantity: 12, price: 16.67 },
    { name: "Squadretta di montaggio 2 tagli - 100 pz", category: "Servizio", supplier: "Koch", code: "93.407.0507/0510", h: 50, l: 70, p: 40, quantity: 1, price: 79.4 },
    { name: "Spessori per vetro GL-SV rosso - 500 pz", category: "Servizio", supplier: "Koch", code: "85.818.503", h: 3, l: 100, p: 50, quantity: 1, price: 61.45 },
    { name: "Spessore gommato Gluske nero - 100 pz", category: "Servizio", supplier: "Koch", code: "85.235.102", h: 10, l: 170, p: 53, quantity: 2, price: 174.34 },
];

const CATEGORY_CODES: Record<string, string> = {
    "Legno": "LEG",
    "Utensili": "UTE",
    "Levigatura": "LEV",
    "Verniciatura": "VER",
    "Magazzino": "MAG",
    "Materiale di consumo": "CON",
    "Servizio": "SER",
};

function supplierCode(name: string): string {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 16);
}

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase env vars. Run with --env-file=.env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
    console.log("📦 Inserimento articoli inventario Suisseframe\n");

    const { data: site, error: siteError } = await supabase
        .from("sites")
        .select("id")
        .eq("subdomain", SUBDOMAIN)
        .single();

    if (siteError || !site) {
        throw new Error(`Sito "${SUBDOMAIN}" non trovato: ${siteError?.message}`);
    }
    const siteId = site.id;

    // Warehouse
    let warehouseId: string;
    const { data: existingWh } = await supabase
        .from("inventory_warehouses")
        .select("id")
        .eq("site_id", siteId)
        .eq("name", "Magazzino principale")
        .maybeSingle();

    if (existingWh) {
        warehouseId = existingWh.id;
    } else {
        const { data: wh, error } = await supabase
            .from("inventory_warehouses")
            .insert({ site_id: siteId, name: "Magazzino principale", code: "MAG-01" })
            .select("id")
            .single();
        if (error || !wh) throw new Error(`inventory_warehouses: ${error?.message}`);
        warehouseId = wh.id;
    }

    // Unit "pz"
    const { data: unitPz } = await supabase
        .from("inventory_units")
        .select("id")
        .eq("code", "pz")
        .maybeSingle();

    // Categorie
    const categoryIdByName = new Map<string, string>();
    for (const name of Array.from(new Set(ARTICLES.map((a) => a.category)))) {
        const { data: existing } = await supabase
            .from("inventory_categories")
            .select("id")
            .eq("site_id", siteId)
            .eq("name", name)
            .maybeSingle();

        if (existing) {
            categoryIdByName.set(name, existing.id);
            continue;
        }

        const { data: created, error } = await supabase
            .from("inventory_categories")
            .insert({ site_id: siteId, name, code: CATEGORY_CODES[name] || null })
            .select("id")
            .single();
        if (error || !created) throw new Error(`inventory_categories ${name}: ${error?.message}`);
        categoryIdByName.set(name, created.id);
    }
    console.log(`✓ ${categoryIdByName.size} categorie magazzino`);

    // Fornitori
    const supplierIdByName = new Map<string, string>();
    for (const name of Array.from(new Set(ARTICLES.map((a) => a.supplier)))) {
        const { data: existing } = await supabase
            .from("inventory_suppliers")
            .select("id")
            .eq("site_id", siteId)
            .eq("name", name)
            .maybeSingle();

        if (existing) {
            supplierIdByName.set(name, existing.id);
            continue;
        }

        const { data: created, error } = await supabase
            .from("inventory_suppliers")
            .insert({ site_id: siteId, name, code: supplierCode(name) })
            .select("id")
            .single();
        if (error || !created) throw new Error(`inventory_suppliers ${name}: ${error?.message}`);
        supplierIdByName.set(name, created.id);
    }
    console.log(`✓ ${supplierIdByName.size} fornitori`);

    // Articoli
    const itemIdByName = new Map<string, string>();
    let itemsCreated = 0;
    let variantsCreated = 0;
    let movementsCreated = 0;

    for (const art of ARTICLES) {
        let itemId = itemIdByName.get(art.name);

        if (!itemId) {
            const { data: existingItem } = await supabase
                .from("inventory_items")
                .select("id")
                .eq("site_id", siteId)
                .eq("name", art.name)
                .maybeSingle();

            if (existingItem) {
                itemId = existingItem.id;
            } else {
                const { data: created, error } = await supabase
                    .from("inventory_items")
                    .insert({
                        site_id: siteId,
                        name: art.name,
                        category_id: categoryIdByName.get(art.category),
                        supplier_id: supplierIdByName.get(art.supplier),
                        item_type: "materiale",
                        is_stocked: true,
                        is_consumable: true,
                        is_active: true,
                    })
                    .select("id")
                    .single();
                if (error || !created) throw new Error(`inventory_items ${art.name}: ${error?.message}`);
                itemId = created.id;
                itemsCreated++;
            }
            itemIdByName.set(art.name, itemId);
        }

        // Variante (chiave: internal_code)
        const { data: existingVariant } = await supabase
            .from("inventory_item_variants")
            .select("id")
            .eq("site_id", siteId)
            .eq("internal_code", art.code)
            .maybeSingle();

        if (existingVariant) continue;

        const attributes: Record<string, unknown> = { codice: art.code };
        if (art.h) attributes.altezza = art.h;
        if (art.l) attributes.lunghezza = art.l;
        if (art.p) attributes.profondita = art.p;

        const { data: variant, error: variantError } = await supabase
            .from("inventory_item_variants")
            .insert({
                item_id: itemId,
                site_id: siteId,
                internal_code: art.code,
                supplier_code: art.code,
                unit_id: unitPz?.id,
                purchase_unit_price: art.price,
                attributes,
            })
            .select("id")
            .single();
        if (variantError || !variant) throw new Error(`inventory_item_variants ${art.code}: ${variantError?.message}`);
        variantsCreated++;

        if (art.quantity > 0) {
            const { error: movError } = await supabase.from("inventory_stock_movements").insert({
                site_id: siteId,
                variant_id: variant.id,
                warehouse_id: warehouseId,
                movement_type: "opening",
                quantity: art.quantity,
                reason: "Giacenza iniziale da rapporto inventario 07.07.2026",
            });
            if (movError) throw new Error(`inventory_stock_movements ${art.code}: ${movError.message}`);
            movementsCreated++;
        }
    }

    console.log(`✓ Articoli: ${itemsCreated} item nuovi, ${variantsCreated} varianti, ${movementsCreated} giacenze`);
    console.log(`\n✅ Inventario Suisseframe aggiornato (${ARTICLES.length} articoli dal campione)`);
}

main().catch((err) => {
    console.error("\n❌ Inserimento fallito:", err);
    process.exit(1);
});
