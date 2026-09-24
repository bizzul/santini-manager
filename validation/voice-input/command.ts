import { z } from "zod";
import {
    SUPPORTED_VOICE_COMMAND_INTENTS,
    VOICE_COMMAND_INTENTS,
} from "@/lib/voice-command-config";
import { TipoDocumentoEnum } from "@/validation/documenti/extracted-document";

export const VoiceCommandIntentSchema = z.enum(VOICE_COMMAND_INTENTS);

// Se il modello restituisce un valore di intent imprevisto (raro, ma possibile
// con provider Anthropic in tool-calling), non facciamo fallire l'intera
// risposta: ricadiamo su "unknown", che route.ts gestisce gia' con una
// richiesta di chiarimento invece di un errore 422 generico.
const SafeVoiceCommandIntentSchema = VoiceCommandIntentSchema.catch("unknown");

export const VoiceCommandRequestSchema = z.object({
    transcript: z.string().trim().min(1, "La trascrizione e' obbligatoria"),
    siteId: z.string().trim().min(1, "Il siteId e' obbligatorio"),
    context: z
        .object({
            pathname: z.string().trim().optional().nullable(),
            currentKanbanId: z.number().int().optional().nullable(),
            currentModule: z.string().trim().optional().nullable(),
            currentScreen: z.string().trim().optional().nullable(),
            screenLabel: z.string().trim().optional().nullable(),
            allowedIntents: z
                .array(z.enum(SUPPORTED_VOICE_COMMAND_INTENTS))
                .optional()
                .default([]),
        })
        .optional()
        .default({}),
});

// Il modello a volte restituisce "" invece di null per un campo assente
// (piu' probabile su trascrizioni ricche con molti campi plausibili): la
// preprocess normalizza "" (anche con soli spazi) a null PRIMA della
// validazione, cosi' generateObject non fallisce con "response did not
// match schema" per questo motivo, il piu' comune riscontrato in produzione.
// .catch(null): qualsiasi altro valore imprevisto (es. un numero o un
// oggetto al posto di una stringa) diventa null invece di far fallire
// l'intera risposta strutturata - un solo campo "strano" non deve piu'
// bloccare l'intero comando vocale.
const NullableString = z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().min(1).nullable().catch(null)
);

// Il modello (soprattutto con provider Anthropic, che usa tool-calling per
// generateObject ed e' meno rigoroso di OpenAI sui tipi) a volte restituisce
// importi/quantita' come stringa invece di number puro, es. "1000",
// "CHF 1'500.-", "1.500,00": la preprocess ripulisce simboli di valuta e
// separatori delle migliaia PRIMA della validazione, cosi' generateObject
// non fallisce con "response did not match schema" per questo motivo -
// causa piu' comune riscontrata in produzione dopo il fix su NullableString.
function coerceNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return Number.isNaN(value) ? null : value;
    if (typeof value !== "string") return value as number | null;

    const trimmed = value.trim();
    if (trimmed === "") return null;

    // Rimuove tutto tranne cifre, virgola, punto e segno meno (valuta, spazi,
    // apostrofi svizzeri delle migliaia, "CHF", ecc.).
    let cleaned = trimmed.replace(/[^0-9,.-]/g, "");
    // Formato "1.500,00" (punto migliaia, virgola decimale): normalizza a "1500.00".
    if (/,\d{1,2}$/.test(cleaned) && cleaned.includes(".")) {
        cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
        cleaned = cleaned.replace(",", ".");
    }

    if (cleaned === "" || cleaned === "-") return null;
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
}

// .catch(null): come per NullableString, un valore non convertibile in
// numero non deve far fallire l'intera risposta strutturata.
const NullableNumber = z.preprocess(
    coerceNullableNumber,
    z.number().nullable().catch(null)
);
const NullableInteger = z.preprocess(
    (value) => {
        const parsed = coerceNullableNumber(value);
        return parsed === null ? null : Math.round(parsed);
    },
    z.number().int().nullable().catch(null)
);

export const VoiceCommandExtractionSchema = z.object({
    intent: SafeVoiceCommandIntentSchema,
    summary: z
        .string()
        .trim()
        .min(1, "Serve un breve riassunto del comando riconosciuto")
        .catch("Comando vocale"),
    needsClarification: z.boolean().catch(false),
    data: z.object({
        clientName: NullableString,
        title: NullableString,
        productName: NullableString,
        productCategory: NullableString,
        productType: NullableString,
        location: NullableString,
        kanbanName: NullableString,
        taskCode: NullableString,
        cardTitle: NullableString,
        targetColumnName: NullableString,
        notes: NullableString,
        deliveryDate: NullableString,
        startTime: NullableString,
        endTime: NullableString,
        sellPrice: NullableNumber,
        pieces: NullableInteger,
        hours: NullableInteger,
        minutes: NullableInteger,
        zipCode: NullableInteger,
        priceList: z.boolean().nullable().catch(null),
        team: z.union([z.literal(1), z.literal(2)]).nullable().catch(null),
        roleName: NullableString,
        internalActivity: NullableString,
        address: NullableString,
        city: NullableString,
        countryCode: NullableString,
        email: NullableString,
        phone: NullableString,
        clientType: z.enum(["BUSINESS", "INDIVIDUAL"]).nullable().catch(null),
        activityType: z.enum(["project", "internal"]).nullable().catch(null),
        lossReason: z
            .enum(["price", "delivery_time", "site_on_hold", "other"])
            .nullable()
            .catch(null),
        tipoDocumento: TipoDocumentoEnum.nullable().catch(null),
        oggetto: NullableString,
        testoDocumento: NullableString,
        destinatarioTipo: z
            .enum(["cliente", "fornitore", "manuale"])
            .nullable()
            .catch(null),
    }),
});

export type VoiceCommandIntent = z.infer<typeof VoiceCommandIntentSchema>;
export type VoiceCommandRequest = z.infer<typeof VoiceCommandRequestSchema>;
export type VoiceCommandExtraction = z.infer<
    typeof VoiceCommandExtractionSchema
>;
