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

const NullableString = z.string().trim().min(1).nullable().optional();
const NullableNumber = z.number().nullable().optional();
const NullableInteger = z.number().int().nullable().optional();

export const VoiceCommandExtractionSchema = z.object({
    intent: VoiceCommandIntentSchema,
    summary: z
        .string()
        .trim()
        .min(1, "Serve un breve riassunto del comando riconosciuto"),
    needsClarification: z.boolean().optional().default(false),
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
        priceList: z.boolean().nullable().optional(),
        team: z.union([z.literal(1), z.literal(2)]).nullable().optional(),
        roleName: NullableString,
        internalActivity: NullableString,
        address: NullableString,
        city: NullableString,
        countryCode: NullableString,
        email: NullableString,
        phone: NullableString,
        clientType: z
            .enum(["BUSINESS", "INDIVIDUAL"])
            .nullable()
            .optional(),
        activityType: z
            .enum(["project", "internal"])
            .nullable()
            .optional(),
        lossReason: z
            .enum(["price", "delivery_time", "site_on_hold", "other"])
            .nullable()
            .optional(),
    }),
});

export type VoiceCommandIntent = z.infer<typeof VoiceCommandIntentSchema>;
export type VoiceCommandRequest = z.infer<typeof VoiceCommandRequestSchema>;
export type VoiceCommandExtraction = z.infer<
    typeof VoiceCommandExtractionSchema
>;
