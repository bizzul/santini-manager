import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";

// CSV field mapping from Italian headers to database columns
const CSV_FIELD_MAPPING: Record<string, string> = {
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
    CHF_ACQUISTO: "unit_price",
    CHF_VENDITA: "sell_price",
    TOTALE: "total_price",
};

// Numeric fields that should be parsed as numbers
const NUMERIC_FIELDS = [
    "width",
    "height",
    "thickness",
    "diameter",
    "quantity",
    "unit_price",
    "sell_price",
    "total_price",
];

interface ImportResult {
    success: boolean;
    totalRows: number;
    imported: number;
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
        // Try to create a descriptive name from available fields
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
            // Fallback to internal_code as name
            product.name = product.internal_code;
        }
    }

    // Set default values for NOT NULL fields
    if (product.unit_price == null) {
        product.unit_price = 0;
    }
    if (product.quantity == null) {
        product.quantity = 0;
    }

    // Calculate total_price if not provided
    if (product.total_price == null) {
        product.total_price = product.unit_price * product.quantity;
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

        // Get existing internal_codes for duplicate checking
        const { data: existingProducts, error: fetchError } = await supabase
            .from("Product")
            .select("internal_code")
            .not("internal_code", "is", null);

        if (fetchError) {
            console.error("Error fetching existing products:", fetchError);
            return NextResponse.json(
                { error: "Errore nel recupero dei prodotti esistenti" },
                { status: 500 },
            );
        }

        const existingCodes = new Set(
            existingProducts?.map((p) => p.internal_code) || [],
        );

        const result: ImportResult = {
            success: true,
            totalRows: rows.length,
            imported: 0,
            skipped: 0,
            errors: [],
            duplicates: [],
        };

        // Process rows in batches for better performance
        const BATCH_SIZE = 50;
        const productsToInsert: Record<string, any>[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const product = mapRowToProduct(headers, row);

                // Check for duplicate
                if (
                    product.internal_code &&
                    existingCodes.has(product.internal_code)
                ) {
                    result.duplicates.push(product.internal_code);
                    if (skipDuplicates) {
                        result.skipped++;
                        continue;
                    } else {
                        // If not skipping duplicates, still skip but note it
                        result.skipped++;
                        continue;
                    }
                }

                // Validate required fields - at minimum we need a name or internal_code
                if (!product.name && !product.internal_code) {
                    result.errors.push(
                        `Riga ${i + 2}: Nome o codice interno richiesto`,
                    );
                    result.skipped++;
                    continue;
                }

                // Add to existing codes set to prevent duplicates within the same import
                if (product.internal_code) {
                    existingCodes.add(product.internal_code);
                }

                productsToInsert.push(product);
            } catch (error: any) {
                result.errors.push(`Riga ${i + 2}: ${error.message}`);
                result.skipped++;
            }
        }

        // Insert products in batches
        for (let i = 0; i < productsToInsert.length; i += BATCH_SIZE) {
            const batch = productsToInsert.slice(i, i + BATCH_SIZE);

            const { error: insertError } = await supabase
                .from("Product")
                .insert(batch);

            if (insertError) {
                console.error("Error inserting batch:", insertError);
                result.errors.push(
                    `Errore inserimento batch ${
                        Math.floor(i / BATCH_SIZE) + 1
                    }: ${insertError.message}`,
                );
            } else {
                result.imported += batch.length;
            }
        }

        // Create action records for imported products
        if (result.imported > 0) {
            await supabase.from("Action").insert({
                type: "product_import",
                data: {
                    imported: result.imported,
                    skipped: result.skipped,
                    duplicates: result.duplicates.length,
                },
                user_id: userContext.user.id,
            });
        }

        result.success = result.errors.length === 0 || result.imported > 0;

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("CSV import error:", error);
        return NextResponse.json(
            { error: `Errore durante l'importazione: ${error.message}` },
            { status: 500 },
        );
    }
}
