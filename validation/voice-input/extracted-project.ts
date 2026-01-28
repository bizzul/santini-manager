import { z } from "zod";

/**
 * Schema for matched client info from database
 */
export const MatchedClientSchema = z.object({
    id: z.number(),
    name: z.string(),
    address: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    zipCode: z.number().nullable().optional(),
});

export type MatchedClient = z.infer<typeof MatchedClientSchema>;

/**
 * Base schema for AI extraction (without client matching fields)
 * This is what the AI model extracts from voice
 */
export const AIExtractedProjectSchema = z.object({
    /** Client name (required) */
    cliente: z.string().describe("Nome completo del cliente"),

    /** Location/address */
    luogo: z.string().describe("Indirizzo completo o luogo del lavoro"),

    /** Product/work type */
    tipoProdotto: z
        .string()
        .describe("Tipo di prodotto o lavoro (es. Finestre in PVC, Porte interne)"),

    /** Supplier name */
    fornitore: z
        .string()
        .nullable()
        .describe("Nome del fornitore, null se non specificato"),

    /** Number of pieces */
    numeroPezzi: z
        .number()
        .int()
        .positive()
        .nullable()
        .describe("Numero di pezzi, null se non specificato"),

    /** Total value in CHF */
    valoreTotale: z
        .number()
        .positive()
        .nullable()
        .describe("Valore totale in CHF, null se non specificato"),

    /** Installation deadline (ISO date string YYYY-MM-DD) */
    terminePosa: z
        .string()
        .nullable()
        .describe("Data termine posa in formato YYYY-MM-DD, null se non specificata"),

    /** Kanban status */
    kanban: z
        .enum(["da_fare", "gia_fatto"])
        .describe("Stato kanban: 'da_fare' o 'gia_fatto'"),

    /** Additional notes */
    note: z
        .string()
        .nullable()
        .describe("Note aggiuntive, null se non presenti"),
});

export type AIExtractedProject = z.infer<typeof AIExtractedProjectSchema>;

/**
 * Full schema including client matching fields (populated after AI extraction)
 * Maps to the Task table structure
 * Note: numeroProgetto is NOT extracted - it's auto-generated at creation time
 */
export const ExtractedProjectSchema = AIExtractedProjectSchema.extend({
    /** Matched client from database (populated after extraction) */
    matchedClient: MatchedClientSchema.nullable().optional(),

    /** Whether this is a new client not in the database */
    isNewClient: z.boolean().optional(),
});

export type ExtractedProject = z.infer<typeof ExtractedProjectSchema>;

/**
 * Schema for the full extraction response
 */
export const ExtractedProjectsResponseSchema = z.object({
    progetti: z.array(ExtractedProjectSchema),
});

export type ExtractedProjectsResponse = z.infer<
    typeof ExtractedProjectsResponseSchema
>;

/**
 * Schema for voice input extraction request
 */
export const VoiceInputRequestSchema = z.object({
    transcript: z.string().min(1, "La trascrizione è richiesta"),
    siteId: z.string().uuid("Site ID non valido"),
});

export type VoiceInputRequest = z.infer<typeof VoiceInputRequestSchema>;
