import { z } from "zod";
import {
    SUPPORTED_VOICE_COMMAND_INTENTS,
    VOICE_COMMAND_INTENTS,
} from "@/lib/voice-command-config";

export const VoiceCommandIntentSchema = z.enum(VOICE_COMMAND_INTENTS);

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

const NullableString = z.string().trim().min(1).nullable();
const NullableNumber = z.number().nullable();
const NullableInteger = z.number().int().nullable();

export const VoiceCommandExtractionSchema = z.object({
    intent: VoiceCommandIntentSchema,
    summary: z
        .string()
        .trim()
        .min(1, "Serve un breve riassunto del comando riconosciuto"),
    needsClarification: z.boolean(),
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
        priceList: z.boolean().nullable(),
        team: z.union([z.literal(1), z.literal(2)]).nullable(),
        roleName: NullableString,
        internalActivity: NullableString,
        address: NullableString,
        city: NullableString,
        countryCode: NullableString,
        email: NullableString,
        phone: NullableString,
        clientType: z.enum(["BUSINESS", "INDIVIDUAL"]).nullable(),
        activityType: z.enum(["project", "internal"]).nullable(),
        lossReason: z
            .enum(["price", "delivery_time", "site_on_hold", "other"])
            .nullable(),
    }),
});

export type VoiceCommandIntent = z.infer<typeof VoiceCommandIntentSchema>;
export type VoiceCommandRequest = z.infer<typeof VoiceCommandRequestSchema>;
export type VoiceCommandExtraction = z.infer<
    typeof VoiceCommandExtractionSchema
>;
