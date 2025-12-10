import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("Manufacturers CSV Import");

// CSV field mapping from Italian headers to database columns
const CSV_FIELD_MAPPING: Record<string, string> = {
    NOME: "name",
    ABBREVIATO: "short_name",
    DESCRIZIONE: "description",
    CATEGORIA: "category",
    INDIRIZZO: "address",
    CAP: "cap",
    LOCALITA: "location",
    WEBSITE: "website",
    EMAIL: "email",
    TELEFONO: "phone",
    CONTATTO: "contact",
};

// Numeric fields that should be parsed as numbers
const NUMERIC_FIELDS = ["cap"];

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

function mapRowToManufacturer(
    headers: string[],
    row: string[],
): Record<string, any> {
    const manufacturer: Record<string, any> = {};

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
            }

            manufacturer[dbField] = value;
        }
    });

    return manufacturer;
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

        // Get existing manufacturers for duplicate checking (by name and short_name)
        const { data: existingManufacturers, error: fetchError } =
            await supabase
                .from("Manufacturer")
                .select("name, short_name")
                .eq("site_id", siteId);

        if (fetchError) {
            log.error("Error fetching existing manufacturers:", fetchError);
            return NextResponse.json(
                { error: "Errore nel recupero dei produttori esistenti" },
                { status: 500 },
            );
        }

        // Get existing manufacturer categories for this site
        const { data: existingCategories, error: categoryFetchError } =
            await supabase
                .from("Manufacturer_category")
                .select("id, name, code")
                .eq("site_id", siteId);

        if (categoryFetchError) {
            log.error(
                "Error fetching manufacturer categories:",
                categoryFetchError,
            );
        }

        // Create maps for quick category lookup
        const categoryByName = new Map<string, number>();
        const categoryByCode = new Map<string, number>();
        existingCategories?.forEach((cat) => {
            if (cat.name) {
                categoryByName.set(cat.name.toLowerCase(), cat.id);
            }
            if (cat.code) {
                categoryByCode.set(cat.code.toLowerCase(), cat.id);
            }
        });

        const existingNames = new Set(
            existingManufacturers
                ?.filter((m) => m.name)
                .map((m) => m.name!.toLowerCase()) || [],
        );
        const existingShortNames = new Set(
            existingManufacturers
                ?.filter((m) => m.short_name)
                .map((m) => m.short_name!.toLowerCase()) || [],
        );

        // Helper function to find or create category
        const findOrCreateCategory = async (
            categoryName: string | null,
        ): Promise<number | null> => {
            if (!categoryName) {
                return null;
            }

            // First try to find by name (case-insensitive)
            const existingId = categoryByName.get(categoryName.toLowerCase());
            if (existingId) {
                return existingId;
            }

            // Category doesn't exist, create it
            const { data: newCategory, error: createError } = await supabase
                .from("Manufacturer_category")
                .insert({
                    name: categoryName,
                    description: categoryName,
                    site_id: siteId,
                })
                .select("id")
                .single();

            if (createError) {
                log.error("Error creating manufacturer category:", createError);
                return null;
            }

            // Add to our map for future lookups
            if (newCategory) {
                categoryByName.set(categoryName.toLowerCase(), newCategory.id);
                return newCategory.id;
            }

            return null;
        };

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
        const manufacturersToInsert: Record<string, any>[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const manufacturer = mapRowToManufacturer(headers, row);

                // Check for duplicates
                const nameDuplicate = manufacturer.name &&
                    existingNames.has(manufacturer.name.toLowerCase());
                const shortNameDuplicate = manufacturer.short_name &&
                    existingShortNames.has(
                        manufacturer.short_name.toLowerCase(),
                    );

                if (nameDuplicate || shortNameDuplicate) {
                    const duplicateField = nameDuplicate
                        ? manufacturer.name
                        : manufacturer.short_name;
                    result.duplicates.push(duplicateField);
                    if (skipDuplicates) {
                        result.skipped++;
                        continue;
                    } else {
                        result.skipped++;
                        continue;
                    }
                }

                // Validate required fields (only name is required)
                if (!manufacturer.name) {
                    result.errors.push(`Riga ${i + 2}: Nome richiesto`);
                    result.skipped++;
                    continue;
                }

                // Find or create the category and set manufacturer_category_id (optional)
                const categoryId = await findOrCreateCategory(
                    manufacturer.category,
                );
                if (categoryId) {
                    manufacturer.manufacturer_category_id = categoryId;
                }
                // Remove the old category string field (we now use manufacturer_category_id)
                delete manufacturer.category;

                // Add to existing sets to prevent duplicates within the same import
                if (manufacturer.name) {
                    existingNames.add(manufacturer.name.toLowerCase());
                }
                if (manufacturer.short_name) {
                    existingShortNames.add(
                        manufacturer.short_name.toLowerCase(),
                    );
                }

                // Add site_id to the manufacturer
                manufacturer.site_id = siteId;

                manufacturersToInsert.push(manufacturer);
            } catch (error: any) {
                result.errors.push(`Riga ${i + 2}: ${error.message}`);
                result.skipped++;
            }
        }

        // Insert manufacturers in batches and collect inserted manufacturer IDs
        const insertedManufacturerIds: number[] = [];

        for (let i = 0; i < manufacturersToInsert.length; i += BATCH_SIZE) {
            const batch = manufacturersToInsert.slice(i, i + BATCH_SIZE);

            const { data: insertedManufacturers, error: insertError } =
                await supabase.from("Manufacturer").insert(batch).select("id");

            if (insertError) {
                log.error("Error inserting batch:", insertError);
                result.errors.push(
                    `Errore inserimento batch ${
                        Math.floor(i / BATCH_SIZE) + 1
                    }: ${insertError.message}`,
                );
            } else {
                result.imported += batch.length;
                // Collect inserted manufacturer IDs
                if (insertedManufacturers) {
                    insertedManufacturerIds.push(
                        ...insertedManufacturers.map((m) => m.id),
                    );
                }
            }
        }

        // Create action records for each imported manufacturer
        if (insertedManufacturerIds.length > 0) {
            const actionRecords = insertedManufacturerIds.map(
                (manufacturerId) => ({
                    type: "manufacturer_import",
                    data: { manufacturerId },
                    user_id: userContext.user.id,
                }),
            );

            // Insert actions in batches
            for (let i = 0; i < actionRecords.length; i += BATCH_SIZE) {
                const actionBatch = actionRecords.slice(i, i + BATCH_SIZE);
                const { error: actionError } = await supabase
                    .from("Action")
                    .insert(actionBatch);

                if (actionError) {
                    log.error("Error creating action records:", actionError);
                }
            }
        }

        result.success = result.errors.length === 0 || result.imported > 0;

        return NextResponse.json(result);
    } catch (error: any) {
        log.error("CSV import error:", error);
        return NextResponse.json(
            { error: `Errore durante l'importazione: ${error.message}` },
            { status: 500 },
        );
    }
}
