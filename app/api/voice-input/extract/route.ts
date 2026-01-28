import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { getSiteAiConfig } from "@/lib/ai/get-site-ai-config";
import {
    AIExtractedProjectSchema,
    VoiceInputRequestSchema,
} from "@/validation/voice-input/extracted-project";

// TOON-style schema hint for efficient prompting
// Note: numeroProgetto is NOT extracted - it's auto-generated at creation time
const TOON_SCHEMA_HINT = `progetti[N]{cliente,luogo,tipoProdotto,fornitore,numeroPezzi,valoreTotale,terminePosa,kanban,note}`;

const SYSTEM_PROMPT = `Sei un assistente specializzato nell'estrazione di dati da trascrizioni vocali di progetti edilizi/di falegnameria.

Estrai TUTTI i progetti menzionati nella trascrizione. Per ogni progetto estrai:
- cliente: nome completo del cliente
- luogo: indirizzo completo
- tipoProdotto: tipo di lavoro/prodotto
- fornitore: nome fornitore, null se non menzionato
- numeroPezzi: numero intero, null se "non specificato"
- valoreTotale: numero decimale in CHF (senza "CHF"), null se non menzionato
- terminePosa: data in formato YYYY-MM-DD, null se non menzionata
- kanban: "gia_fatto" se dice "Già fatto", "da_fare" se dice "Da fare"
- note: tutte le informazioni aggiuntive

IMPORTANTE: NON estrarre il numero progetto (es. "25-267") - verrà generato automaticamente dal sistema.

Regole importanti:
1. Interpreta date relative (es. "settimana prossima", "metà febbraio") rispetto alla data odierna
2. Per valori come "2764.50 CHF" estrai solo il numero 2764.50
3. Se un campo dice "Non specificato" o simile, usa null
4. Estrai TUTTI i progetti, anche se incompleti
5. Ignora eventuali codici progetto menzionati - saranno auto-generati`;

function createModelFromConfig(config: {
    provider: string;
    apiKey: string;
    model: string;
}) {
    switch (config.provider) {
        case "anthropic":
            return createAnthropic({ apiKey: config.apiKey })(config.model);
        case "openai":
        default:
            return createOpenAI({ apiKey: config.apiKey })(config.model);
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Check authentication
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse and validate request body
        const body = await request.json();
        const validationResult = VoiceInputRequestSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Invalid request", details: validationResult.error.errors },
                { status: 400 }
            );
        }

        const { transcript, siteId } = validationResult.data;

        // Get AI configuration for this site
        const aiConfig = await getSiteAiConfig(siteId);

        if (!aiConfig.apiKey) {
            return NextResponse.json(
                {
                    error: "API key AI non configurata",
                    message:
                        "Per utilizzare questa funzionalità, configura la tua API key in Impostazioni > AI & Voice",
                },
                { status: 400 }
            );
        }

        // Create the AI model
        const model = createModelFromConfig({
            provider: aiConfig.provider,
            apiKey: aiConfig.apiKey,
            model: aiConfig.model,
        });

        // Get current date for relative date interpretation
        const today = new Date().toISOString().split("T")[0];

        // Call AI to extract projects (using base schema without client matching fields)
        const { object } = await generateObject({
            model,
            schema: z.object({ progetti: z.array(AIExtractedProjectSchema) }),
            system: SYSTEM_PROMPT,
            prompt: `Data odierna: ${today}

Schema output atteso (formato TOON): ${TOON_SCHEMA_HINT}

Trascrizione vocale da analizzare:
---
${transcript}
---

Estrai tutti i progetti dalla trascrizione sopra.`,
        });

        // Fetch existing clients for this site to match with extracted names
        const { data: existingClients } = await supabase
            .from("Client")
            .select("id, businessName, individualFirstName, individualLastName, clientType, address, city, zipCode")
            .eq("site_id", siteId);

        // Helper to get display name
        const getDisplayName = (c: { businessName?: string | null; individualFirstName?: string | null; individualLastName?: string | null; clientType?: string | null }) => {
            if (c.clientType === "BUSINESS" && c.businessName) {
                return c.businessName;
            }
            const parts = [c.individualFirstName, c.individualLastName].filter(Boolean);
            return parts.join(" ") || c.businessName || "";
        };

        // Create a map for fuzzy client matching (lowercase, trimmed)
        const clientMap = new Map(
            existingClients?.map((c) => [
                getDisplayName(c).toLowerCase().trim(),
                {
                    id: c.id,
                    name: getDisplayName(c),
                    address: c.address,
                    city: c.city,
                    zipCode: c.zipCode,
                },
            ]) || []
        );

        // Match clients and enrich project data
        const enrichedProjects = object.progetti.map((project) => {
            const clientKey = project.cliente.toLowerCase().trim();
            const matchedClient = clientMap.get(clientKey);

            if (matchedClient) {
                // Client found - use address from DB if project has no location
                const luogoFromDb = [
                    matchedClient.address,
                    matchedClient.zipCode,
                    matchedClient.city,
                ]
                    .filter(Boolean)
                    .join(", ");

                return {
                    ...project,
                    matchedClient,
                    isNewClient: false,
                    // Use DB address if voice didn't specify a location
                    luogo: project.luogo || luogoFromDb || "",
                };
            }

            // New client
            return {
                ...project,
                matchedClient: null,
                isNewClient: true,
            };
        });

        return NextResponse.json({
            success: true,
            progetti: enrichedProjects,
            count: enrichedProjects.length,
        });
    } catch (error) {
        console.error("Error extracting projects from voice:", error);

        // Handle specific AI errors
        if (error instanceof Error) {
            if (error.message.includes("API key")) {
                return NextResponse.json(
                    { error: "API key non valida o scaduta" },
                    { status: 401 }
                );
            }
            if (error.message.includes("rate limit")) {
                return NextResponse.json(
                    { error: "Troppi richieste, riprova tra poco" },
                    { status: 429 }
                );
            }
        }

        return NextResponse.json(
            { error: "Errore durante l'estrazione dei progetti" },
            { status: 500 }
        );
    }
}
