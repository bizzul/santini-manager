import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";

// CSV field mapping from Italian headers to database columns
const CSV_FIELD_MAPPING: Record<string, string> = {
    ID: "id",
    COD_INT: "internal_code",
    CATEGORIA: "category_name", // Special field for category lookup
    NOME_PRODOTTO: "name",
    SOTTOCATEGORIA: "type",
    DESCRIZIONE: "description",
    LISTINO_PREZZI: "price_list",
    URL_IMMAGINE: "image_url",
    URL_DOC: "doc_url",
};

// Numeric fields that should be parsed as numbers
const NUMERIC_FIELDS = ["id"];

// Boolean fields that should be parsed as booleans
const BOOLEAN_FIELDS = ["price_list"];

// Valid boolean true values
const BOOLEAN_TRUE_VALUES = ["SI", "SÌ", "YES", "1", "TRUE", "VERO"];

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

function mapRowToSellProduct(
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
            } else if (NUMERIC_FIELDS.includes(dbField)) {
                // Parse numeric fields
                const parsed = parseInt(value, 10);
                value = isNaN(parsed) ? null : parsed;
            } else if (BOOLEAN_FIELDS.includes(dbField)) {
                // Parse boolean fields
                value = BOOLEAN_TRUE_VALUES.includes(value.toUpperCase());
            }

            product[dbField] = value;
        }
    });

    // Set default values
    if (product.price_list == null) {
        product.price_list = false;
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

        // Validate required headers
        const requiredHeaders = ["COD_INT", "NOME_PRODOTTO"];
        const missingHeaders = requiredHeaders.filter((h) =>
            !headers.includes(h)
        );
        if (missingHeaders.length > 0) {
            return NextResponse.json(
                {
                    error: `Colonne mancanti nel CSV: ${
                        missingHeaders.join(", ")
                    }`,
                },
                { status: 400 },
            );
        }

        const supabase = await createClient();

        // Get existing products for duplicate checking (scoped by site)
        const { data: existingProducts, error: fetchError } = await supabase
            .from("SellProduct")
            .select("id, internal_code")
            .eq("site_id", siteId);

        if (fetchError) {
            console.error("Error fetching existing products:", fetchError);
            return NextResponse.json(
                { error: "Errore nel recupero dei prodotti esistenti" },
                { status: 500 },
            );
        }

        // Get existing categories for this site
        const { data: existingCategories, error: catFetchError } =
            await supabase
                .from("sellproduct_categories")
                .select("id, name")
                .eq("site_id", siteId);

        if (catFetchError) {
            console.error("Error fetching categories:", catFetchError);
            return NextResponse.json(
                { error: "Errore nel recupero delle categorie" },
                { status: 500 },
            );
        }

        // Create a map of category name -> id
        const categoryMap = new Map<string, number>(
            existingCategories?.map((c) => [c.name.toLowerCase(), c.id]) || [],
        );

        // Create set of existing IDs for update checking
        const existingIds = new Set(
            existingProducts?.map((p) => p.id) || [],
        );
        const existingCodes = new Set(
            existingProducts?.filter((p) => p.internal_code).map((p) => p.internal_code) || [],
        );

        const result: ImportResult = {
            success: true,
            totalRows: rows.length,
            imported: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            duplicates: [],
        };

        // Collect unique category names from CSV that don't exist
        const categoriesToCreate = new Set<string>();

        // First pass: identify missing categories
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const product = mapRowToSellProduct(headers, row);
            if (product.category_name && !categoryMap.has(product.category_name.toLowerCase())) {
                categoriesToCreate.add(product.category_name);
            }
        }

        // Create missing categories
        if (categoriesToCreate.size > 0) {
            const newCategories = Array.from(categoriesToCreate).map((
                name,
            ) => ({
                site_id: siteId,
                name: name,
            }));

            const { data: createdCats, error: createCatError } = await supabase
                .from("sellproduct_categories")
                .insert(newCategories)
                .select("id, name");

            if (createCatError) {
                console.error("Error creating categories:", createCatError);
                // Non-fatal: continue with import, categories will be null
            } else if (createdCats) {
                // Add newly created categories to the map
                createdCats.forEach((c) => {
                    categoryMap.set(c.name.toLowerCase(), c.id);
                });
            }
        }

        // Process rows in batches for better performance
        const BATCH_SIZE = 50;
        const productsToInsert: Record<string, any>[] = [];
        const productsToUpdate: Record<string, any>[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const product = mapRowToSellProduct(headers, row);

                // Check if this is an update (has ID that exists in DB)
                const isUpdate = product.id && existingIds.has(product.id);

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
                if (!product.name) {
                    result.errors.push(
                        `Riga ${i + 2}: Nome prodotto richiesto`,
                    );
                    result.skipped++;
                    continue;
                }

                // Set category_id based on category name (optional)
                if (product.category_name) {
                    const categoryId = categoryMap.get(product.category_name.toLowerCase());
                    if (categoryId) {
                        product.category_id = categoryId;
                    }
                    // Remove category_name as it's not a database field
                    delete product.category_name;
                }

                // Add site_id to the product
                product.site_id = siteId;

                if (isUpdate) {
                    // For updates, keep the ID and add to update list
                    productsToUpdate.push(product);
                } else {
                    // For new records, remove ID and add to insert list
                    delete product.id;
                    product.active = true;

                    // Add to existing codes set to prevent duplicates within the same import
                    if (product.internal_code) {
                        existingCodes.add(product.internal_code);
                    }

                    productsToInsert.push(product);
                }
            } catch (error: any) {
                result.errors.push(`Riga ${i + 2}: ${error.message}`);
                result.skipped++;
            }
        }

        // Update existing products one by one
        for (const product of productsToUpdate) {
            const productId = product.id;
            delete product.id;
            delete product.site_id;

            const { error: updateError } = await supabase
                .from("SellProduct")
                .update(product)
                .eq("id", productId)
                .eq("site_id", siteId);

            if (updateError) {
                console.error("Error updating product:", updateError);
                result.errors.push(
                    `Errore aggiornamento prodotto ID ${productId}: ${updateError.message}`,
                );
            } else {
                result.updated++;
            }
        }

        // Insert products in batches and collect inserted product IDs
        const insertedProductIds: number[] = [];

        for (let i = 0; i < productsToInsert.length; i += BATCH_SIZE) {
            const batch = productsToInsert.slice(i, i + BATCH_SIZE);

            const { data: insertedProducts, error: insertError } =
                await supabase
                    .from("SellProduct")
                    .insert(batch)
                    .select("id");

            if (insertError) {
                console.error("Error inserting batch:", insertError);
                result.errors.push(
                    `Errore inserimento batch ${
                        Math.floor(i / BATCH_SIZE) + 1
                    }: ${insertError.message}`,
                );
            } else {
                result.imported += batch.length;
                // Collect inserted product IDs
                if (insertedProducts) {
                    insertedProductIds.push(
                        ...insertedProducts.map((p) => p.id),
                    );
                }
            }
        }

        // Create action records for each imported product
        if (insertedProductIds.length > 0) {
            const actionRecords = insertedProductIds.map((productId) => ({
                type: "sell_product_import",
                data: { sellProductId: productId },
                user_id: userContext.user.id,
            }));

            // Insert actions in batches
            for (let i = 0; i < actionRecords.length; i += BATCH_SIZE) {
                const actionBatch = actionRecords.slice(i, i + BATCH_SIZE);
                const { error: actionError } = await supabase
                    .from("Action")
                    .insert(actionBatch);

                if (actionError) {
                    console.error(
                        "Error creating action records:",
                        actionError,
                    );
                }
            }
        }

        result.success = result.errors.length === 0 || result.imported > 0 || result.updated > 0;

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("CSV import error:", error);
        return NextResponse.json(
            { error: `Errore durante l'importazione: ${error.message}` },
            { status: 500 },
        );
    }
}
