import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";

// CSV field mapping from Italian headers to database columns
const CSV_FIELD_MAPPING: Record<string, string> = {
    TIPO: "clientType",
    RAGIONE_SOCIALE: "businessName",
    TITOLO: "individualTitle",
    NOME: "individualFirstName",
    COGNOME: "individualLastName",
    LINGUA: "clientLanguage",
    INDIRIZZO: "address",
    CITTA: "city",
    NAZIONE: "countryCode",
    CAP: "zipCode",
    TELEFONO: "phone",
    CELLULARE: "mobile",
    EMAIL: "email",
};

// Numeric fields that should be parsed as numbers
const NUMERIC_FIELDS = ["zipCode"];

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

function mapRowToClient(
    headers: string[],
    row: string[],
): Record<string, any> {
    const client: Record<string, any> = {};

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

            client[dbField] = value;
        }
    });

    // Normalize clientType
    if (client.clientType) {
        const type = client.clientType.toUpperCase();
        if (type === "BUSINESS" || type === "AZIENDA") {
            client.clientType = "BUSINESS";
        } else if (type === "INDIVIDUAL" || type === "PRIVATO") {
            client.clientType = "INDIVIDUAL";
        }
    }

    // Set default clientType if not provided
    if (!client.clientType) {
        client.clientType = client.businessName ? "BUSINESS" : "INDIVIDUAL";
    }

    return client;
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

        // Get existing clients for duplicate checking (by email and businessName)
        const { data: existingClients, error: fetchError } = await supabase
            .from("Client")
            .select("email, businessName")
            .eq("site_id", siteId);

        if (fetchError) {
            console.error("Error fetching existing clients:", fetchError);
            return NextResponse.json(
                { error: "Errore nel recupero dei clienti esistenti" },
                { status: 500 },
            );
        }

        const existingEmails = new Set(
            existingClients
                ?.filter((c) => c.email)
                .map((c) => c.email!.toLowerCase()) || [],
        );
        const existingBusinessNames = new Set(
            existingClients
                ?.filter((c) => c.businessName)
                .map((c) => c.businessName!.toLowerCase()) || [],
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
        const clientsToInsert: Record<string, any>[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const client = mapRowToClient(headers, row);

                // Check for duplicates
                const emailDuplicate = client.email &&
                    existingEmails.has(client.email.toLowerCase());
                const businessNameDuplicate = client.businessName &&
                    existingBusinessNames.has(
                        client.businessName.toLowerCase(),
                    );

                if (emailDuplicate || businessNameDuplicate) {
                    const duplicateField = emailDuplicate
                        ? client.email
                        : client.businessName;
                    result.duplicates.push(duplicateField);
                    if (skipDuplicates) {
                        result.skipped++;
                        continue;
                    } else {
                        result.skipped++;
                        continue;
                    }
                }

                // Validate required fields
                if (!client.address) {
                    result.errors.push(`Riga ${i + 2}: Indirizzo richiesto`);
                    result.skipped++;
                    continue;
                }

                if (!client.city) {
                    result.errors.push(`Riga ${i + 2}: Città richiesta`);
                    result.skipped++;
                    continue;
                }

                if (!client.countryCode) {
                    result.errors.push(`Riga ${i + 2}: Codice paese richiesto`);
                    result.skipped++;
                    continue;
                }

                if (client.zipCode === null) {
                    result.errors.push(`Riga ${i + 2}: CAP richiesto`);
                    result.skipped++;
                    continue;
                }

                // Validate based on client type
                if (client.clientType === "BUSINESS" && !client.businessName) {
                    result.errors.push(
                        `Riga ${
                            i + 2
                        }: Ragione sociale richiesta per cliente business`,
                    );
                    result.skipped++;
                    continue;
                }

                if (
                    client.clientType === "INDIVIDUAL" &&
                    !client.individualFirstName &&
                    !client.individualLastName
                ) {
                    result.errors.push(
                        `Riga ${
                            i + 2
                        }: Nome o cognome richiesto per cliente privato`,
                    );
                    result.skipped++;
                    continue;
                }

                // Add to existing sets to prevent duplicates within the same import
                if (client.email) {
                    existingEmails.add(client.email.toLowerCase());
                }
                if (client.businessName) {
                    existingBusinessNames.add(
                        client.businessName.toLowerCase(),
                    );
                }

                // Add site_id to the client
                client.site_id = siteId;

                clientsToInsert.push(client);
            } catch (error: any) {
                result.errors.push(`Riga ${i + 2}: ${error.message}`);
                result.skipped++;
            }
        }

        // Insert clients in batches and collect inserted client IDs
        const insertedClientIds: number[] = [];

        for (let i = 0; i < clientsToInsert.length; i += BATCH_SIZE) {
            const batch = clientsToInsert.slice(i, i + BATCH_SIZE);

            const { data: insertedClients, error: insertError } = await supabase
                .from("Client")
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
                // Collect inserted client IDs
                if (insertedClients) {
                    insertedClientIds.push(
                        ...insertedClients.map((c) => c.id),
                    );
                }
            }
        }

        // Create action records for each imported client
        if (insertedClientIds.length > 0) {
            const actionRecords = insertedClientIds.map((clientId) => ({
                type: "client_import",
                clientId: clientId,
                user_id: userContext.user.id,
                data: {},
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
