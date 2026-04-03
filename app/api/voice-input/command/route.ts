import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/utils/supabase/server";
import { getSiteAiConfig } from "@/lib/ai/get-site-ai-config";
import { formatLocalDate } from "@/lib/utils";
import {
    analyzeVoiceCommandKeywords,
    getVoiceCommandIntentLabel,
    getVoiceCommandIntentLabels,
    getVoiceCommandScreenContext,
    SUPPORTED_VOICE_COMMAND_INTENTS,
    type SupportedVoiceCommandIntent,
} from "@/lib/voice-command-config";
import {
    VoiceCommandExtractionSchema,
    VoiceCommandRequestSchema,
} from "@/validation/voice-input/command";

type MatchResult<T> = {
    match: T | null;
    ambiguous: boolean;
};

type ClientRecord = {
    id: number;
    businessName?: string | null;
    individualFirstName?: string | null;
    individualLastName?: string | null;
    clientType?: string | null;
};

type KanbanRecord = {
    id: number;
    title?: string | null;
    identifier?: string | null;
    is_offer_kanban?: boolean | null;
};

type ColumnRecord = {
    id: number;
    kanbanId: number;
    title?: string | null;
    identifier?: string | null;
    position?: number | null;
    column_type?: string | null;
};

type TaskRecord = {
    id: number;
    unique_code?: string | null;
    title?: string | null;
    name?: string | null;
    clientId?: number | null;
    kanbanId: number;
    kanbanColumnId?: number | null;
    archived?: boolean | null;
};

type ProductCategoryRecord = {
    id: number;
    name?: string | null;
};

type RoleRecord = {
    id: number;
    name?: string | null;
    site_id?: string | null;
};

type InternalActivityRecord = {
    id: string;
    code?: string | null;
    label?: string | null;
    site_id?: string | null;
};

const SYSTEM_PROMPT = `Sei un assistente che interpreta comandi vocali per un gestionale.

Puoi riconoscere solo questi intenti:
- create_project
- create_offer
- create_client
- create_product
- schedule_task
- log_time
- move_card
- unknown

Regole:
1. Estrai un solo intento principale.
2. NON inventare dati mancanti.
3. Se il comando non e' sufficientemente chiaro, imposta needsClarification=true.
4. Riassunto summary: breve, in italiano, max 1 frase.
5. Il modulo corrente aiuta a disambiguare:
   - clients -> preferisci create_client
   - products -> preferisci create_product
   - calendar / calendar-installation / calendar-service -> preferisci schedule_task
   - timetracking -> preferisci log_time
   - kanban / projects / offerte -> preferisci create_project, create_offer, move_card
6. Rispetta sempre gli intenti consentiti della schermata corrente.
7. Se la trascrizione usa "sposta progetto", "sposta offerta" o "sposta lavoro", interpretala come move_card.
8. Per create_project e create_offer estrai:
   - clientName, title, location, kanbanName, sellPrice, pieces, deliveryDate, notes
9. Per create_client estrai:
   - clientName
   - clientType: BUSINESS o INDIVIDUAL
   - address, city, zipCode, countryCode
   - email, phone
10. Per create_product estrai:
   - productName
   - productCategory
   - productType
   - notes come descrizione se presente
   - priceList true se viene citato listino prezzi
11. Per schedule_task estrai:
   - taskCode o cardTitle
   - deliveryDate
   - startTime e endTime in formato HH:mm se presenti
   - team: 1 o 2 se citata la squadra
   - notes
12. Per log_time estrai:
   - activityType: project o internal
   - taskCode o cardTitle se project
   - internalActivity se internal
   - roleName se citato il reparto
   - hours e minutes
   - notes
13. Per move_card estrai:
   - taskCode o cardTitle
   - targetColumnName
   - lossReason se serve
   - notes
14. Mantieni null per i campi assenti.
15. needsClarification deve essere sempre presente come boolean.
16. Dentro data restituisci sempre TUTTI i campi previsti dallo schema; se un valore manca usa null.

Esempi:
- "crea offerta per Rossi serramenti a Lugano da 4500 franchi" -> create_offer
- "crea cliente Bianchi SA via Roma 1 Lugano 6900 svizzera" -> create_client
- "aggiungi prodotto armadio categoria cucine" -> create_product
- "programma la card 26-044 il 15 aprile alle 08:00" -> schedule_task
- "registra 2 ore sul progetto 26-011 reparto montaggio" -> log_time
- "sposta il progetto 26-632 in inviata" -> move_card`;

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

function normalizeText(value?: string | null) {
    return (value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function getClientDisplayName(client: Partial<ClientRecord>) {
    if (client.clientType === "BUSINESS" && client.businessName) {
        return client.businessName;
    }

    return [client.individualFirstName, client.individualLastName]
        .filter(Boolean)
        .join(" ");
}

function scoreTextMatch(candidate: string, query: string) {
    if (!candidate || !query) return 0;
    if (candidate === query) return 120;
    if (candidate.startsWith(query)) return 100;
    if (candidate.includes(query)) return 90;

    const queryTokens = query.split(" ").filter(Boolean);
    if (
        queryTokens.length > 0 &&
        queryTokens.every((token) => candidate.includes(token))
    ) {
        return 70;
    }

    return 0;
}

function pickBestMatch<T>(
    items: T[],
    query: string | null | undefined,
    getTexts: (item: T) => Array<string | null | undefined>
): MatchResult<T> {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
        return { match: null, ambiguous: false };
    }

    const scored = items
        .map((item) => {
            const score = getTexts(item)
                .map((text) => scoreTextMatch(normalizeText(text), normalizedQuery))
                .reduce<number>((best, current) => Math.max(best, current), 0);

            return { item, score };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
        return { match: null, ambiguous: false };
    }

    const [first, second] = scored;
    const ambiguous =
        !!second && first.score === second.score && first.score < 120;

    return {
        match: ambiguous ? null : first.item,
        ambiguous,
    };
}

function joinNotes(parts: Array<string | null | undefined>) {
    const value = parts
        .map((part) => part?.trim())
        .filter(Boolean)
        .join("\n");

    return value || undefined;
}

function buildColumnsMap(columns: ColumnRecord[]) {
    const map = new Map<number, ColumnRecord[]>();

    for (const column of columns) {
        const existing = map.get(column.kanbanId) || [];
        existing.push(column);
        map.set(column.kanbanId, existing);
    }

    for (const [kanbanId, kanbanColumns] of Array.from(map.entries())) {
        map.set(
            kanbanId,
            [...kanbanColumns].sort(
                (a, b) => (a.position || 0) - (b.position || 0)
            )
        );
    }

    return map;
}

function buildResponse(payload: Record<string, unknown>) {
    return NextResponse.json({
        success: true,
        ...payload,
    });
}

function buildClarification(
    question: string,
    missingFields: string[] = [],
    examples: string[] = []
) {
    return {
        question,
        missingFields,
        examples,
    };
}

function buildClarificationResponse(payload: {
    intent: string;
    summary: string;
    message: string;
    question: string;
    missingFields?: string[];
    examples?: string[];
    preview?: Record<string, unknown>;
}) {
    return buildResponse({
        status: "needs_clarification",
        intent: payload.intent,
        summary: payload.summary,
        message: payload.message,
        preview: payload.preview,
        clarification: buildClarification(
            payload.question,
            payload.missingFields,
            payload.examples
        ),
    });
}

function asSupportedIntentList(
    intents?: readonly string[] | null
): SupportedVoiceCommandIntent[] {
    const supportedIntents = new Set(SUPPORTED_VOICE_COMMAND_INTENTS);

    return (intents || []).filter(
        (intent): intent is SupportedVoiceCommandIntent =>
            supportedIntents.has(intent as SupportedVoiceCommandIntent)
    );
}

function splitFullName(fullName: string) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
        return {
            firstName: parts[0] || "",
            lastName: "",
        };
    }

    return {
        firstName: parts.slice(0, -1).join(" "),
        lastName: parts.slice(-1).join(" "),
    };
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const validationResult = VoiceCommandRequestSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: "Invalid request",
                    details: validationResult.error.issues,
                },
                { status: 400 }
            );
        }

        const { transcript, siteId, context } = validationResult.data;
        const screenContext = getVoiceCommandScreenContext(context.pathname);
        const currentModule = context.currentModule || screenContext.module;
        const allowedIntents =
            asSupportedIntentList(context.allowedIntents) ||
            screenContext.allowedIntents;
        const effectiveAllowedIntents =
            allowedIntents.length > 0 ? allowedIntents : screenContext.allowedIntents;
        const keywordAnalysis = analyzeVoiceCommandKeywords(
            transcript,
            effectiveAllowedIntents
        );
        const aiConfig = await getSiteAiConfig(siteId);

        if (!aiConfig.apiKey) {
            return NextResponse.json(
                {
                    error: "API key AI non configurata",
                    message:
                        "Configura la chiave AI del sito per interpretare i comandi vocali.",
                },
                { status: 400 }
            );
        }

        const model = createModelFromConfig({
            provider: aiConfig.provider,
            apiKey: aiConfig.apiKey,
            model: aiConfig.model,
        });

        const today = formatLocalDate(new Date());
        const keywordCoverageSummary = keywordAnalysis.coverage
            .map((entry) =>
                `${getVoiceCommandIntentLabel(entry.intent)}: ${
                    entry.matched
                        ? "keyword minime presenti"
                        : `mancano ${entry.missingLabels.join(", ")}`
                }`
            )
            .join("\n");
        const { object: command } = await generateObject({
            model,
            schema: VoiceCommandExtractionSchema,
            system: SYSTEM_PROMPT,
            prompt: `Data odierna: ${today}
Percorso corrente: ${context.pathname || "sconosciuto"}
Schermata corrente: ${screenContext.label}
Modulo corrente: ${currentModule}
Kanban corrente: ${context.currentKanbanId || "nessuna"}
Intenti consentiti: ${effectiveAllowedIntents.join(", ")}
Intenti suggeriti dalle keyword: ${
                keywordAnalysis.recognizedIntents.join(", ") || "nessuno"
            }
Copertura keyword:
${keywordCoverageSummary || "nessuna"}

Trascrizione:
---
${transcript}
---

Interpreta il comando e restituisci solo l'oggetto strutturato richiesto.`,
        });

        if (
            command.intent !== "unknown" &&
            !effectiveAllowedIntents.includes(command.intent)
        ) {
            return buildClarificationResponse({
                intent: command.intent,
                summary: command.summary,
                message: `In questa schermata posso solo ${getVoiceCommandIntentLabels(
                    effectiveAllowedIntents
                ).join(", ")}.`,
                question: `Vuoi riformulare il comando per ${getVoiceCommandIntentLabels(
                    effectiveAllowedIntents
                ).join(", ")}?`,
                examples: screenContext.examples,
            });
        }

        if (command.intent === "unknown") {
            return buildClarificationResponse({
                intent: command.intent,
                summary: command.summary,
                message:
                    effectiveAllowedIntents.length > 0
                        ? `Non ho riconosciuto un'azione supportata in questa schermata. Posso aiutarti a ${getVoiceCommandIntentLabels(
                              effectiveAllowedIntents
                          ).join(", ")}.`
                        : "Non ho riconosciuto un'azione supportata.",
                question:
                    effectiveAllowedIntents.length > 0
                        ? `Vuoi ${getVoiceCommandIntentLabels(
                              effectiveAllowedIntents
                          ).join(", ")}?`
                        : "Puoi riformulare il comando in modo piu' specifico?",
                examples: screenContext.examples,
            });
        }

        const [clientsResult, kanbansResult, tasksResult] = await Promise.all([
            supabase
                .from("Client")
                .select(
                    "id, businessName, individualFirstName, individualLastName, clientType"
                )
                .eq("site_id", siteId),
            supabase
                .from("Kanban")
                .select("id, title, identifier, is_offer_kanban")
                .eq("site_id", siteId),
            supabase
                .from("Task")
                .select(
                    "id, unique_code, title, name, clientId, kanbanId, kanbanColumnId, archived"
                )
                .eq("site_id", siteId)
                .eq("archived", false),
        ]);

        if (clientsResult.error || kanbansResult.error || tasksResult.error) {
            return NextResponse.json(
                { error: "Errore nel recupero del contesto del sito" },
                { status: 500 }
            );
        }

        const clients = (clientsResult.data || []) as ClientRecord[];
        const kanbans = (kanbansResult.data || []) as KanbanRecord[];
        const tasks = (tasksResult.data || []) as TaskRecord[];
        const kanbanIds = kanbans.map((kanban) => kanban.id);
        const columnsResult =
            kanbanIds.length > 0
                ? await supabase
                      .from("KanbanColumn")
                      .select(
                          "id, kanbanId, title, identifier, position, column_type"
                      )
                      .in("kanbanId", kanbanIds)
                : { data: [], error: null };

        if (columnsResult.error) {
            return NextResponse.json(
                { error: "Errore nel recupero delle colonne kanban" },
                { status: 500 }
            );
        }

        const columns = (columnsResult.data || []) as ColumnRecord[];
        const columnsByKanban = buildColumnsMap(columns);
        const currentKanban =
            kanbans.find((kanban) => kanban.id === context.currentKanbanId) || null;
        const clientMap = new Map(clients.map((client) => [client.id, client]));

        const resolveClient = (name?: string | null) =>
            pickBestMatch(clients, name, (client) => [
                getClientDisplayName(client),
                client.businessName,
            ]);

        const resolveKanban = (
            availableKanbans: KanbanRecord[],
            requestedName?: string | null,
            fallback?: (items: KanbanRecord[]) => KanbanRecord | null
        ): MatchResult<KanbanRecord> => {
            if (
                currentKanban &&
                availableKanbans.some((kanban) => kanban.id === currentKanban.id) &&
                !requestedName
            ) {
                return { match: currentKanban, ambiguous: false };
            }

            const requestedMatch = pickBestMatch(
                availableKanbans,
                requestedName,
                (kanban) => [kanban.title, kanban.identifier]
            );

            if (requestedMatch.match || requestedMatch.ambiguous) {
                return requestedMatch;
            }

            return {
                match: fallback?.(availableKanbans) || null,
                ambiguous: false,
            };
        };

        const resolveTask = () => {
            const requestedTask =
                command.data.taskCode ||
                command.data.cardTitle ||
                command.data.title ||
                command.data.clientName;

            return command.data.taskCode
                ? pickBestMatch(tasks, command.data.taskCode, (task) => [
                      task.unique_code,
                  ])
                : pickBestMatch(tasks, requestedTask, (task) => {
                      const taskClient = task.clientId
                          ? clientMap.get(task.clientId) || null
                          : null;
                      const clientName = taskClient
                          ? getClientDisplayName(taskClient)
                          : null;

                      return [task.unique_code, task.title, task.name, clientName];
                  });
        };

        const resolveProductCategory = async (
            requestedCategory?: string | null
        ): Promise<MatchResult<ProductCategoryRecord>> => {
            const categoriesResult = await supabase
                .from("sellproduct_categories")
                .select("id, name")
                .eq("site_id", siteId)
                .order("name", { ascending: true });

            if (categoriesResult.error) {
                throw new Error("Errore nel recupero delle categorie prodotto");
            }

            const categories = (categoriesResult.data || []) as ProductCategoryRecord[];

            if (categories.length === 0) {
                return { match: null, ambiguous: false };
            }

            if (!requestedCategory && categories.length === 1) {
                return { match: categories[0], ambiguous: false };
            }

            return pickBestMatch(categories, requestedCategory, (category) => [
                category.name,
            ]);
        };

        if (command.intent === "create_offer") {
            const offerKanbans = kanbans.filter((kanban) => kanban.is_offer_kanban);
            const kanbanResult = resolveKanban(
                offerKanbans,
                command.data.kanbanName,
                (items) => items[0] || null
            );

            if (kanbanResult.ambiguous) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Ho trovato piu' kanban offerte compatibili. Specifica meglio la kanban.",
                    question: "In quale kanban offerte devo creare la richiesta?",
                    missingFields: ["kanbanName"],
                });
            }

            const targetKanban = kanbanResult.match;
            if (!targetKanban) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Non ho trovato una kanban offerte su cui creare la richiesta.",
                    question: "Su quale kanban offerte vuoi creare questa richiesta?",
                    missingFields: ["kanbanName"],
                });
            }

            const clientResult = resolveClient(command.data.clientName);
            if (clientResult.ambiguous) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Ho trovato piu' clienti simili. Specifica meglio il cliente.",
                    question: "Qual e' il cliente esatto per l'offerta?",
                    missingFields: ["clientName"],
                });
            }

            const operationBody = {
                kanbanId: targetKanban.id,
                taskType: "OFFERTA",
                clientId: clientResult.match?.id ?? null,
                name: command.data.title || "Offerta vocale",
                luogo: command.data.location || undefined,
                sellPrice: command.data.sellPrice ?? 0,
                numero_pezzi: command.data.pieces ?? null,
                deliveryDate: command.data.deliveryDate || undefined,
                other: joinNotes([
                    command.data.notes,
                    !clientResult.match && command.data.clientName
                        ? `Cliente dettato: ${command.data.clientName}`
                        : null,
                    `Trascrizione originale: ${transcript}`,
                ]),
            };

            return buildResponse({
                status: command.needsClarification ? "needs_clarification" : "ready",
                intent: command.intent,
                summary: command.summary,
                preview: {
                    kanban: targetKanban.title || targetKanban.identifier,
                    client: clientResult.match
                        ? getClientDisplayName(clientResult.match)
                        : command.data.clientName || "Non associato",
                    title: operationBody.name,
                    location: operationBody.luogo || null,
                    sellPrice: operationBody.sellPrice,
                },
                message: command.needsClarification
                    ? "Il comando e' stato capito solo in parte. Verifica i dettagli prima di riprovare."
                    : undefined,
                clarification: command.needsClarification
                    ? buildClarification(
                          "Quale dettaglio vuoi aggiungere per completare l'offerta?",
                          ["clientName", "sellPrice", "deliveryDate"],
                          [
                              "Per il cliente Rossi serramenti",
                              "Da 4500 franchi con consegna il 15 aprile",
                          ]
                      )
                    : null,
                operation: command.needsClarification
                    ? null
                    : {
                          endpoint: "/api/kanban/tasks/create",
                          method: "POST",
                          body: operationBody,
                      },
            });
        }

        if (command.intent === "create_project") {
            const projectKanbans = kanbans.filter(
                (kanban) => !kanban.is_offer_kanban
            );
            const kanbanResult = resolveKanban(
                projectKanbans,
                command.data.kanbanName,
                (items) => {
                    const productionKanban =
                        items.find(
                            (kanban) =>
                                normalizeText(kanban.identifier) === "production" ||
                                normalizeText(kanban.title) === "production"
                        ) || null;

                    return productionKanban || items[0] || null;
                }
            );

            if (kanbanResult.ambiguous) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Ho trovato piu' kanban progetto compatibili. Specifica meglio dove creare il progetto.",
                    question: "In quale kanban progetto devo creare il lavoro?",
                    missingFields: ["kanbanName"],
                });
            }

            const targetKanban = kanbanResult.match;
            if (!targetKanban) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Non ho trovato una kanban progetto su cui creare il lavoro.",
                    question: "Su quale kanban progetto vuoi creare questo lavoro?",
                    missingFields: ["kanbanName"],
                });
            }

            const clientResult = resolveClient(command.data.clientName);
            if (clientResult.ambiguous) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Ho trovato piu' clienti simili. Specifica meglio il cliente.",
                    question: "Qual e' il cliente esatto per il progetto?",
                    missingFields: ["clientName"],
                });
            }

            const operationBody = {
                kanbanId: targetKanban.id,
                taskType: "LAVORO",
                clientId: clientResult.match?.id ?? null,
                name: command.data.title || "Progetto vocale",
                luogo: command.data.location || undefined,
                sellPrice: command.data.sellPrice ?? 0,
                numero_pezzi: command.data.pieces ?? null,
                deliveryDate: command.data.deliveryDate || undefined,
                other: joinNotes([
                    command.data.notes,
                    !clientResult.match && command.data.clientName
                        ? `Cliente dettato: ${command.data.clientName}`
                        : null,
                    `Trascrizione originale: ${transcript}`,
                ]),
            };

            return buildResponse({
                status: command.needsClarification ? "needs_clarification" : "ready",
                intent: command.intent,
                summary: command.summary,
                preview: {
                    kanban: targetKanban.title || targetKanban.identifier,
                    client: clientResult.match
                        ? getClientDisplayName(clientResult.match)
                        : command.data.clientName || "Non associato",
                    title: operationBody.name,
                    location: operationBody.luogo || null,
                    sellPrice: operationBody.sellPrice,
                },
                message: command.needsClarification
                    ? "Il comando e' stato capito solo in parte. Verifica i dettagli prima di riprovare."
                    : undefined,
                clarification: command.needsClarification
                    ? buildClarification(
                          "Quale dettaglio vuoi aggiungere per completare il progetto?",
                          ["clientName", "deliveryDate", "location"],
                          [
                              "Cliente Bianchi, consegna 15 aprile",
                              "A Lugano in via Cantonale 12",
                          ]
                      )
                    : null,
                operation: command.needsClarification
                    ? null
                    : {
                          endpoint: "/api/kanban/tasks/create",
                          method: "POST",
                          body: operationBody,
                      },
            });
        }

        if (command.intent === "create_product") {
            const productName = command.data.productName || command.data.title;
            if (!productName) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Per aggiungere un prodotto mi serve almeno il nome dell'articolo.",
                    question: "Qual e' il nome del prodotto da creare?",
                    missingFields: ["productName"],
                    examples: [
                        "Aggiungi prodotto armadio categoria cucine",
                        "Crea articolo tavolo rovere categoria soggiorno",
                    ],
                });
            }

            const categoryResult = await resolveProductCategory(
                command.data.productCategory
            );

            if (categoryResult.ambiguous) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Ho trovato piu' categorie prodotto compatibili. Specifica meglio la categoria.",
                    question: "In quale categoria vuoi inserire il prodotto?",
                    missingFields: ["productCategory"],
                });
            }

            if (!categoryResult.match) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Per creare il prodotto mi serve una categoria esistente.",
                    question: "Qual e' la categoria prodotto corretta?",
                    missingFields: ["productCategory"],
                    examples: [
                        "Categoria cucine",
                        "Categoria soggiorno",
                    ],
                });
            }

            const operationBody = {
                category: categoryResult.match.name || "",
                name: productName,
                type: command.data.productType || "",
                description: command.data.notes || "",
                price_list: command.data.priceList ?? false,
                image_url: "",
                doc_url: "",
                active: true,
            };

            return buildResponse({
                status: command.needsClarification ? "needs_clarification" : "ready",
                intent: command.intent,
                summary: command.summary,
                preview: {
                    productName: operationBody.name,
                    category: operationBody.category,
                    type: operationBody.type || null,
                    priceList: operationBody.price_list ? "si" : "no",
                },
                message: command.needsClarification
                    ? "Il comando e' stato capito solo in parte. Verifica nome e categoria del prodotto."
                    : undefined,
                clarification: command.needsClarification
                    ? buildClarification(
                          "Vuoi aggiungere sottocategoria o descrizione del prodotto?",
                          ["productType", "notes"],
                          [
                              "Sottocategoria armadi su misura",
                              "Descrizione finitura rovere naturale",
                          ]
                      )
                    : null,
                operation: command.needsClarification
                    ? null
                    : {
                          endpoint: "/api/sell-products",
                          method: "POST",
                          body: operationBody,
                      },
            });
        }

        if (command.intent === "create_client") {
            const clientName = command.data.clientName || command.data.title;
            if (
                !clientName ||
                !command.data.address ||
                !command.data.city ||
                !command.data.countryCode ||
                !command.data.zipCode
            ) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Per creare un cliente mi servono almeno nome, indirizzo, citta', CAP e paese.",
                    question:
                        "Dimmi nome cliente, indirizzo, citta', CAP e paese per completare la creazione.",
                    missingFields: [
                        "clientName",
                        "address",
                        "city",
                        "zipCode",
                        "countryCode",
                    ],
                    examples: [
                        "Bianchi SA in via Roma 1 Lugano 6900 Svizzera",
                        "Mario Rossi in via Cantonale 12 Bellinzona 6500 Svizzera",
                    ],
                });
            }

            const clientType = command.data.clientType || "BUSINESS";
            const splitName = splitFullName(clientName);

            if (clientType === "INDIVIDUAL" && !splitName.lastName) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Per un cliente persona fisica mi servono almeno nome e cognome.",
                    question: "Qual e' il cognome del cliente?",
                    missingFields: ["clientName"],
                });
            }

            const operationBody = {
                clientType,
                businessName: clientType === "BUSINESS" ? clientName : "",
                individualFirstName:
                    clientType === "INDIVIDUAL" ? splitName.firstName : "",
                individualLastName:
                    clientType === "INDIVIDUAL" ? splitName.lastName : "",
                address: command.data.address,
                city: command.data.city,
                zipCode: command.data.zipCode,
                countryCode: command.data.countryCode,
                email: command.data.email || "",
                phone: command.data.phone || "",
            };

            return buildResponse({
                status: command.needsClarification ? "needs_clarification" : "ready",
                intent: command.intent,
                summary: command.summary,
                preview: {
                    clientName,
                    clientType,
                    address: operationBody.address,
                    city: operationBody.city,
                    zipCode: operationBody.zipCode,
                    countryCode: operationBody.countryCode,
                },
                message: command.needsClarification
                    ? "Il comando e' stato capito solo in parte. Verifica i dettagli del cliente."
                    : undefined,
                clarification: command.needsClarification
                    ? buildClarification(
                          "Quale altro dettaglio del cliente vuoi aggiungere?",
                          ["email", "phone"],
                          [
                              "Email info@bianchi.ch",
                              "Telefono 091 000 00 00",
                          ]
                      )
                    : null,
                operation: command.needsClarification
                    ? null
                    : {
                          endpoint: "/api/clients",
                          method: "POST",
                          body: operationBody,
                      },
            });
        }

        if (command.intent === "schedule_task") {
            const taskResult = resolveTask();
            if (taskResult.ambiguous) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Ho trovato piu' task simili. Indica il codice progetto o un nome piu' preciso.",
                    question: "Qual e' il codice esatto del task da pianificare?",
                    missingFields: ["taskCode"],
                });
            }

            const task = taskResult.match;
            if (!task) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message: "Non ho trovato il task da pianificare.",
                    question: "Qual e' il codice o il nome del task che vuoi pianificare?",
                    missingFields: ["taskCode"],
                });
            }

            if (!command.data.deliveryDate) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Per pianificare il task mi serve almeno la data dell'appuntamento.",
                    question: "In quale data devo pianificare il task?",
                    missingFields: ["deliveryDate"],
                    examples: [
                        "Il 15 aprile",
                        "Domani alle 08:00",
                    ],
                });
            }

            const taskClient =
                task.clientId && clientMap.get(task.clientId)
                    ? getClientDisplayName(clientMap.get(task.clientId)!)
                    : null;

            return buildResponse({
                status: command.needsClarification ? "needs_clarification" : "ready",
                intent: command.intent,
                summary: command.summary,
                preview: {
                    taskCode: task.unique_code || null,
                    taskTitle: task.title || task.name || null,
                    client: taskClient,
                    deliveryDate: command.data.deliveryDate,
                    startTime: command.data.startTime || null,
                    endTime: command.data.endTime || null,
                    team: command.data.team || null,
                },
                message: command.needsClarification
                    ? "Il comando e' stato capito solo in parte. Verifica data e orario."
                    : undefined,
                clarification: command.needsClarification
                    ? buildClarification(
                          "Vuoi aggiungere anche orario o squadra?",
                          ["startTime", "endTime", "team"],
                          [
                              "Alle 08:00 fino alle 10:30",
                              "Squadra 2",
                          ]
                      )
                    : null,
                operation: command.needsClarification
                    ? null
                    : {
                          endpoint: `/api/kanban/tasks/${task.id}`,
                          method: "PATCH",
                          body: {
                              deliveryDate: command.data.deliveryDate,
                              ora_inizio: command.data.startTime || undefined,
                              ora_fine: command.data.endTime || undefined,
                              squadra: command.data.team || undefined,
                          },
                      },
            });
        }

        if (command.intent === "log_time") {
            const hours = command.data.hours ?? 0;
            const minutes = command.data.minutes ?? 0;

            if (hours === 0 && minutes === 0) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Per registrare ore mi serve una durata valida, per esempio 2 ore o 1 ora e 30 minuti.",
                    question: "Quante ore e minuti devo registrare?",
                    missingFields: ["hours", "minutes"],
                    examples: [
                        "2 ore",
                        "1 ora e 30 minuti",
                    ],
                });
            }

            const [rolesResult, internalActivitiesResult] = await Promise.all([
                supabase
                    .from("Roles")
                    .select("id, name, site_id")
                    .or(`site_id.eq.${siteId},site_id.is.null`),
                supabase
                    .from("internal_activities")
                    .select("id, code, label, site_id")
                    .eq("is_active", true)
                    .or(`site_id.eq.${siteId},site_id.is.null`),
            ]);

            if (rolesResult.error || internalActivitiesResult.error) {
                return NextResponse.json(
                    { error: "Errore nel recupero di ruoli o attivita' interne" },
                    { status: 500 }
                );
            }

            const roles = (rolesResult.data || []) as RoleRecord[];
            const internalActivities = (internalActivitiesResult.data ||
                []) as InternalActivityRecord[];
            const activityType =
                command.data.activityType ||
                (command.data.internalActivity ? "internal" : "project");

            if (activityType === "internal") {
                const internalActivity =
                    command.data.internalActivity || command.data.notes;
                if (!internalActivity) {
                    return buildClarificationResponse({
                        intent: command.intent,
                        summary: command.summary,
                        message:
                            "Per registrare un'attivita' interna devo sapere quale attivita' hai svolto.",
                        question: "Quale attivita' interna devo registrare?",
                        missingFields: ["internalActivity"],
                    });
                }

                const matchedActivity = pickBestMatch(
                    internalActivities,
                    internalActivity,
                    (item) => [item.label, item.code]
                );

                return buildResponse({
                    status: command.needsClarification ? "needs_clarification" : "ready",
                    intent: command.intent,
                    summary: command.summary,
                    preview: {
                        activityType: "internal",
                        internalActivity:
                            matchedActivity.match?.label ||
                            matchedActivity.match?.code ||
                            internalActivity,
                        hours,
                        minutes,
                    },
                    message: command.needsClarification
                        ? "Il comando e' stato capito solo in parte. Verifica l'attivita' interna."
                        : undefined,
                    clarification: command.needsClarification
                        ? buildClarification(
                              "Vuoi aggiungere una descrizione dell'attivita' interna?",
                              ["notes"],
                              ["Riunione con il team", "Lavoro amministrativo"]
                          )
                        : null,
                    operation: command.needsClarification
                        ? null
                        : {
                              endpoint: "/api/time-tracking/create",
                              method: "POST",
                              body: [
                                  {
                                      userId: user.id,
                                      hours,
                                      minutes,
                                      activityType: "internal",
                                      internalActivity:
                                          matchedActivity.match?.code ||
                                          internalActivity,
                                      description: command.data.notes || undefined,
                                  },
                              ],
                          },
                });
            }

            const taskResult = resolveTask();
            if (taskResult.ambiguous) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Ho trovato piu' progetti simili. Per le ore indica il codice progetto preciso.",
                    question: "Qual e' il codice progetto preciso per registrare le ore?",
                    missingFields: ["taskCode"],
                });
            }

            const task = taskResult.match;
            if (!task?.unique_code) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Per registrare ore su progetto devo sapere su quale progetto lavorare.",
                    question: "Su quale progetto devo registrare le ore?",
                    missingFields: ["taskCode"],
                });
            }

            const roleResult = command.data.roleName
                ? pickBestMatch(roles, command.data.roleName, (role) => [role.name])
                : roles.length === 1
                ? { match: roles[0], ambiguous: false }
                : { match: null, ambiguous: false };

            if (roleResult.ambiguous) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Ho trovato piu' reparti simili. Specifica meglio il reparto per la registrazione ore.",
                    question: "Qual e' il reparto corretto per questa registrazione ore?",
                    missingFields: ["roleName"],
                });
            }

            if (!roleResult.match) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Per registrare ore su progetto mi serve anche il reparto, per esempio montaggio o ufficio tecnico.",
                    question: "Quale reparto devo associare a queste ore?",
                    missingFields: ["roleName"],
                    examples: ["Montaggio", "Ufficio tecnico", "Produzione"],
                });
            }

            const taskClient =
                task.clientId && clientMap.get(task.clientId)
                    ? getClientDisplayName(clientMap.get(task.clientId)!)
                    : null;

            return buildResponse({
                status: command.needsClarification ? "needs_clarification" : "ready",
                intent: command.intent,
                summary: command.summary,
                preview: {
                    activityType: "project",
                    taskCode: task.unique_code,
                    taskTitle: task.title || task.name || null,
                    client: taskClient,
                    role: roleResult.match.name || null,
                    hours,
                    minutes,
                },
                message: command.needsClarification
                    ? "Il comando e' stato capito solo in parte. Verifica progetto e reparto."
                    : undefined,
                clarification: command.needsClarification
                    ? buildClarification(
                          "Vuoi aggiungere una descrizione del lavoro svolto?",
                          ["notes"],
                          ["Montaggio serramenti", "Preparazione materiale"]
                      )
                    : null,
                operation: command.needsClarification
                    ? null
                    : {
                          endpoint: "/api/time-tracking/create",
                          method: "POST",
                          body: [
                              {
                                  userId: user.id,
                                  hours,
                                  minutes,
                                  activityType: "project",
                                  task: task.unique_code,
                                  roles: {
                                      id: roleResult.match.id,
                                      name: roleResult.match.name || "",
                                  },
                                  description: command.data.notes || undefined,
                              },
                          ],
                      },
            });
        }

        if (command.intent === "move_card") {
            const taskResult = resolveTask();
            if (taskResult.ambiguous) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Ho trovato piu' card simili. Indica il codice progetto o un nome piu' preciso.",
                    question: "Qual e' il codice esatto della card da spostare?",
                    missingFields: ["taskCode"],
                });
            }

            const task = taskResult.match;
            if (!task) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message: "Non ho trovato la card da spostare.",
                    question: "Qual e' il codice o il nome della card che vuoi spostare?",
                    missingFields: ["taskCode"],
                });
            }

            const taskColumns = columnsByKanban.get(task.kanbanId) || [];
            const columnResult = pickBestMatch(
                taskColumns,
                command.data.targetColumnName,
                (column) => [column.title, column.identifier]
            );

            if (columnResult.ambiguous) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Ho trovato piu' colonne possibili. Specifica meglio la destinazione.",
                    question: "In quale colonna vuoi spostare la card?",
                    missingFields: ["targetColumnName"],
                });
            }

            const targetColumn = columnResult.match;
            if (!targetColumn) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Non ho trovato la colonna di destinazione per la card.",
                    question: "In quale colonna devo spostare la card?",
                    missingFields: ["targetColumnName"],
                });
            }

            if (task.kanbanColumnId === targetColumn.id) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message: "La card e' gia' nella colonna richiesta.",
                    question: "Vuoi spostarla in una colonna diversa? Quale?",
                    missingFields: ["targetColumnName"],
                });
            }

            if (
                targetColumn.column_type === "lost" &&
                !command.data.lossReason
            ) {
                return buildClarificationResponse({
                    intent: command.intent,
                    summary: command.summary,
                    message:
                        "Per spostare una card in persa devo sapere la motivazione: prezzo, tempi, cantiere fermo o altro.",
                    question:
                        "Qual e' la motivazione della perdita? Prezzo, tempi, cantiere fermo o altro?",
                    missingFields: ["lossReason"],
                });
            }

            const kanban = kanbans.find((item) => item.id === task.kanbanId);
            const client =
                task.clientId && clientMap.get(task.clientId)
                    ? getClientDisplayName(clientMap.get(task.clientId)!)
                    : null;

            return buildResponse({
                status: command.needsClarification ? "needs_clarification" : "ready",
                intent: command.intent,
                summary: command.summary,
                preview: {
                    taskCode: task.unique_code || null,
                    taskTitle: task.title || task.name || null,
                    client,
                    kanban: kanban?.title || kanban?.identifier || null,
                    targetColumn: targetColumn.title || targetColumn.identifier || null,
                },
                message: command.needsClarification
                    ? "Il comando e' stato capito solo in parte. Verifica i dettagli prima di riprovare."
                    : undefined,
                clarification: command.needsClarification
                    ? buildClarification(
                          "Vuoi aggiungere qualche nota sullo spostamento?",
                          ["notes"],
                          ["Da seguire la prossima settimana"]
                      )
                    : null,
                operation: command.needsClarification
                    ? null
                    : {
                          endpoint: "/api/kanban/tasks/move",
                          method: "POST",
                          body: {
                              id: task.id,
                              column: targetColumn.id,
                              columnName:
                                  targetColumn.identifier || targetColumn.title || "",
                              lossReason: command.data.lossReason || undefined,
                          },
                      },
            });
        }

        return buildClarificationResponse({
            intent: command.intent,
            summary: command.summary,
            message: "Comando vocale non supportato.",
            question: "Puoi riformulare il comando in modo piu' specifico?",
        });
    } catch (error) {
        console.error("Error handling voice command:", error);

        return NextResponse.json(
            {
                error: "Errore durante l'interpretazione del comando vocale",
                message:
                    error instanceof Error && error.message
                        ? error.message
                        : "Controlla la trascrizione o riprova tra qualche secondo.",
            },
            { status: 500 }
        );
    }
}
