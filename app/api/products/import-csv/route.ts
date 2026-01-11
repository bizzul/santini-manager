import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";

// CSV field mapping from Italian headers to database columns
const CSV_FIELD_MAPPING: Record<string, string> = {
    ID: "variant_id",
    CAT: "category",
    COD_CAT: "category_code",
    S_CAT: "subcategory",
    COD_S_CAT: "subcategory_code",
    S_CAT_2: "subcategory2",
    COD_S_CAT_2: "subcategory2_code",
    COLORE: "color",
    COD_COLORE: "color_code",
    COD_INT: "internal_code",
    NR_MAG: "warehouse_number",
    FORNITORE: "supplier",
    COD_FORN: "supplier_code",
    PRODUTTORE: "producer",
    COD_PROD: "producer_code",
    NOME: "name",
    DESCRIZIONE: "description",
    URL_TDS: "url_tds",
    URL_IMM: "image_url",
    LARGHEZZA: "width",
    ALTEZZA: "height",
    SPESSORE: "thickness",
    DIAMETRO: "diameter",
    "UNITÀ": "unit",
    PZ: "quantity",
    CHF_ACQUISTO: "purchase_unit_price",
    CHF_VENDITA: "sell_unit_price",
    TOTALE: "total_price",
    // Legacy field mapping
    LUNGHEZZA: "length",
};

// Numeric fields that should be parsed as numbers
const NUMERIC_FIELDS = [
    "width",
    "height",
    "length",
    "thickness",
    "diameter",
    "quantity",
    "purchase_unit_price",
    "sell_unit_price",
    "total_price",
];

// UUID fields that should remain as strings
const UUID_FIELDS = ["variant_id"];

interface ImportResult {
    success: boolean;
    totalRows: number;
    imported: number;
    updated: number;
    skipped: number;
    errors: string[];
    duplicates: string[];
}

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current.trim());

    return result;
}

function parseCSV(csvText: string): { headers: string[]; rows: string[][] } {
    const lines = csvText.split("\n").filter((line) => line.trim() !== "");
    if (lines.length === 0) {
        return { headers: [], rows: [] };
    }

    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map((line) => parseCSVLine(line));

    return { headers, rows };
}

function mapRowToProduct(
    headers: string[],
    row: string[],
): Record<string, any> {
    const product: Record<string, any> = {};

    headers.forEach((header, index) => {
        const dbField = CSV_FIELD_MAPPING[header];
        if (dbField && row[index] !== undefined) {
            let value: any = row[index].trim();

            // Handle empty values
            if (value === "") {
                value = null;
            } else if (UUID_FIELDS.includes(dbField)) {
                // Keep UUID fields as strings
                value = value;
            } else if (NUMERIC_FIELDS.includes(dbField)) {
                // Parse numeric fields
                const parsed = parseFloat(value.replace(",", "."));
                value = isNaN(parsed) ? null : parsed;
            }

            product[dbField] = value;
        }
    });

    // If name is empty, generate one from other fields
    if (!product.name) {
        const nameParts: string[] = [];

        if (product.subcategory2) {
            nameParts.push(product.subcategory2);
        } else if (product.subcategory) {
            nameParts.push(product.subcategory);
        } else if (product.category) {
            nameParts.push(product.category);
        }

        if (product.color) {
            nameParts.push(product.color);
        }

        if (nameParts.length > 0) {
            product.name = nameParts.join(" - ");
        } else if (product.internal_code) {
            product.name = product.internal_code;
        }
    }

    return product;
}

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const userContext = await getUserContext();
        if (!userContext || !userContext.user) {
            return NextResponse.json(
                { error: "Non autorizzato" },
                { status: 401 },
            );
        }

        // Get site_id from request
        const siteDomain = request.headers.get("x-site-domain");
        let siteId: string | null = null;

        if (siteDomain) {
            const context = await getSiteContextFromDomain(siteDomain);
            siteId = context.siteId;
        } else {
            const context = await getSiteContext(request);
            siteId = context.siteId;
        }

        if (!siteId) {
            return NextResponse.json(
                { error: "Site ID richiesto per l'importazione" },
                { status: 400 },
            );
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const skipDuplicates = formData.get("skipDuplicates") === "true";

        if (!file) {
            return NextResponse.json(
                { error: "Nessun file fornito" },
                { status: 400 },
            );
        }

        // Read file content
        const csvText = await file.text();
        const { headers, rows } = parseCSV(csvText);

        if (headers.length === 0 || rows.length === 0) {
            return NextResponse.json(
                { error: "Il file CSV è vuoto o non valido" },
                { status: 400 },
            );
        }

        const supabase = await createClient();

        // Get existing variants for duplicate and update checking
        const { data: existingVariants, error: fetchError } = await supabase
            .from("inventory_item_variants")
            .select("id, internal_code")
            .eq("site_id", siteId);

        if (fetchError) {
            console.error("Error fetching existing variants:", fetchError);
        }

        // Create set of existing IDs for update checking
        const existingIds = new Set(
            existingVariants?.map((v) => v.id) || [],
        );
        const existingCodes = new Set(
            existingVariants?.filter((v) => v.internal_code).map((v) =>
                v.internal_code
            ) || [],
        );

        // Get existing categories for this site
        const { data: existingCategories, error: categoryFetchError } =
            await supabase
                .from("inventory_categories")
                .select("id, name, code")
                .eq("site_id", siteId);

        if (categoryFetchError) {
            console.error("Error fetching categories:", categoryFetchError);
        }

        // Create category maps
        const categoryByCode = new Map<string, string>();
        const categoryByName = new Map<string, string>();
        existingCategories?.forEach((cat) => {
            if (cat.code) {
                categoryByCode.set(cat.code.toLowerCase(), cat.id);
            }
            if (cat.name) {
                categoryByName.set(cat.name.toLowerCase(), cat.id);
            }
        });

        // Get existing suppliers
        const { data: existingSuppliers } = await supabase
            .from("inventory_suppliers")
            .select("id, name")
            .eq("site_id", siteId);

        const supplierByName = new Map<string, string>();
        existingSuppliers?.forEach((sup) => {
            if (sup.name) {
                supplierByName.set(sup.name.toLowerCase(), sup.id);
            }
        });

        // Get default unit (pz)
        const { data: defaultUnit } = await supabase
            .from("inventory_units")
            .select("id")
            .eq("code", "pz")
            .single();
        const defaultUnitId = defaultUnit?.id;

        const result: ImportResult = {
            success: true,
            totalRows: rows.length,
            imported: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            duplicates: [],
        };

        // Helper function to find or create category
        const findOrCreateCategory = async (
            categoryName: string | null,
            categoryCode: string | null,
        ): Promise<string | null> => {
            if (!categoryName && !categoryCode) {
                return null;
            }

            // First try to find by code
            if (categoryCode) {
                const existingId = categoryByCode.get(
                    categoryCode.toLowerCase(),
                );
                if (existingId) {
                    return existingId;
                }
            }

            // Then try to find by name
            if (categoryName) {
                const existingId = categoryByName.get(
                    categoryName.toLowerCase(),
                );
                if (existingId) {
                    return existingId;
                }
            }

            // Category doesn't exist, create it
            const { data: newCategory, error: createError } = await supabase
                .from("inventory_categories")
                .insert({
                    name: categoryName || categoryCode,
                    code: categoryCode || null,
                    site_id: siteId,
                })
                .select("id")
                .single();

            if (createError) {
                console.error("Error creating category:", createError);
                return null;
            }

            if (newCategory) {
                if (categoryCode) {
                    categoryByCode.set(
                        categoryCode.toLowerCase(),
                        newCategory.id,
                    );
                }
                if (categoryName) {
                    categoryByName.set(
                        categoryName.toLowerCase(),
                        newCategory.id,
                    );
                }
                return newCategory.id;
            }

            return null;
        };

        // Helper function to find or create supplier
        const findOrCreateSupplier = async (
            supplierName: string | null,
        ): Promise<string | null> => {
            if (!supplierName) {
                return null;
            }

            const existingId = supplierByName.get(supplierName.toLowerCase());
            if (existingId) {
                return existingId;
            }

            // Create new supplier
            const { data: newSupplier, error } = await supabase
                .from("inventory_suppliers")
                .insert({
                    name: supplierName,
                    site_id: siteId,
                })
                .select("id")
                .single();

            if (error) {
                console.error("Error creating supplier:", error);
                return null;
            }

            if (newSupplier) {
                supplierByName.set(supplierName.toLowerCase(), newSupplier.id);
                return newSupplier.id;
            }

            return null;
        };

        // Process rows
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const product = mapRowToProduct(headers, row);

                // Check if this is an update (has variant_id that exists in DB)
                const isUpdate = product.variant_id &&
                    existingIds.has(product.variant_id);

                if (!isUpdate) {
                    // For new records, check for duplicate by internal_code
                    if (
                        product.internal_code &&
                        existingCodes.has(product.internal_code)
                    ) {
                        result.duplicates.push(product.internal_code);
                        if (skipDuplicates) {
                            result.skipped++;
                            continue;
                        } else {
                            result.skipped++;
                            continue;
                        }
                    }
                }

                // Validate required fields
                if (!product.name && !product.internal_code) {
                    result.errors.push(
                        `Riga ${i + 2}: Nome o codice interno richiesto`,
                    );
                    result.skipped++;
                    continue;
                }

                // Build attributes for variant
                const attributes = {
                    color: product.color || null,
                    color_code: product.color_code || null,
                    width: product.width || null,
                    height: product.height || null,
                    length: product.length || null,
                    thickness: product.thickness || null,
                    diameter: product.diameter || null,
                    category: product.category || null,
                    category_code: product.category_code || null,
                    subcategory: product.subcategory || null,
                    subcategory_code: product.subcategory_code || null,
                    subcategory2: product.subcategory2 || null,
                    subcategory2_code: product.subcategory2_code || null,
                    legacy_unit: product.unit || null,
                };

                if (isUpdate) {
                    // Update existing variant
                    const variantId = product.variant_id;

                    const { error: updateError } = await supabase
                        .from("inventory_item_variants")
                        .update({
                            internal_code: product.internal_code || null,
                            supplier_code: product.supplier_code || null,
                            producer: product.producer || null,
                            producer_code: product.producer_code || null,
                            purchase_unit_price: product.purchase_unit_price ||
                                0,
                            sell_unit_price: product.sell_unit_price || null,
                            attributes,
                            image_url: product.image_url || null,
                            url_tds: product.url_tds || null,
                            warehouse_number: product.warehouse_number || null,
                        })
                        .eq("id", variantId)
                        .eq("site_id", siteId);

                    if (updateError) {
                        result.errors.push(
                            `Riga ${
                                i + 2
                            }: Errore aggiornamento variante - ${updateError.message}`,
                        );
                        result.skipped++;
                        continue;
                    }

                    result.updated++;
                } else {
                    // Create new item and variant
                    // Find or create category
                    const categoryId = await findOrCreateCategory(
                        product.category,
                        product.category_code,
                    );

                    // Find or create supplier
                    const supplierId = await findOrCreateSupplier(
                        product.supplier,
                    );

                    // Create inventory_item
                    const { data: item, error: itemError } = await supabase
                        .from("inventory_items")
                        .insert({
                            site_id: siteId,
                            name: product.name || product.internal_code,
                            description: product.description || null,
                            category_id: categoryId,
                            supplier_id: supplierId,
                            is_stocked: true,
                            is_consumable: true,
                            is_active: true,
                        })
                        .select("id")
                        .single();

                    if (itemError) {
                        result.errors.push(
                            `Riga ${
                                i + 2
                            }: Errore creazione item - ${itemError.message}`,
                        );
                        result.skipped++;
                        continue;
                    }

                    // Create inventory_item_variant
                    const { data: variant, error: variantError } =
                        await supabase
                            .from("inventory_item_variants")
                            .insert({
                                item_id: item.id,
                                site_id: siteId,
                                internal_code: product.internal_code || null,
                                supplier_code: product.supplier_code || null,
                                producer: product.producer || null,
                                producer_code: product.producer_code || null,
                                unit_id: defaultUnitId,
                                purchase_unit_price:
                                    product.purchase_unit_price || 0,
                                sell_unit_price: product.sell_unit_price ||
                                    null,
                                attributes,
                                image_url: product.image_url || null,
                                url_tds: product.url_tds || null,
                                warehouse_number: product.warehouse_number ||
                                    null,
                            })
                            .select("id")
                            .single();

                    if (variantError) {
                        // Rollback item
                        await supabase.from("inventory_items").delete().eq(
                            "id",
                            item.id,
                        );
                        result.errors.push(
                            `Riga ${
                                i + 2
                            }: Errore creazione variante - ${variantError.message}`,
                        );
                        result.skipped++;
                        continue;
                    }

                    // Create initial stock movement if quantity > 0
                    const quantity = product.quantity || 0;
                    if (quantity > 0) {
                        await supabase
                            .from("inventory_stock_movements")
                            .insert({
                                site_id: siteId,
                                variant_id: variant.id,
                                movement_type: "opening",
                                quantity,
                                unit_id: defaultUnitId,
                                reason: "Importazione CSV",
                                reference_type: "csv_import",
                            });
                    }

                    // Add to existing codes set
                    if (product.internal_code) {
                        existingCodes.add(product.internal_code);
                    }

                    result.imported++;
                }
            } catch (error: any) {
                result.errors.push(`Riga ${i + 2}: ${error.message}`);
                result.skipped++;
            }
        }

        // Create action record for the import
        if (result.imported > 0 || result.updated > 0) {
            await supabase.from("Action").insert({
                type: "inventory_csv_import",
                user_id: userContext.user.id,
                data: {
                    imported: result.imported,
                    updated: result.updated,
                    skipped: result.skipped,
                    duplicates: result.duplicates.length,
                },
            });
        }

        result.success = result.errors.length === 0 || result.imported > 0 ||
            result.updated > 0;

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("CSV import error:", error);
        return NextResponse.json(
            { error: `Errore durante l'importazione: ${error.message}` },
            { status: 500 },
        );
    }
}
