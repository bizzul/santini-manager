import { cache } from "react";
import { getSiteAiConfig, type SpeechProvider } from "@/lib/ai/get-site-ai-config";
import {
    resolveServerSttProviderType,
    type ServerSttProviderType,
} from "@/lib/speech/server";

export interface ResolvedSttConfig {
    speechProvider: SpeechProvider;
    sttProvider: ServerSttProviderType;
    apiKey: string;
}

export interface SttConfigError {
    error: string;
    message: string;
    status: number;
}

export type SttConfigResult =
    | { ok: true; config: ResolvedSttConfig }
    | { ok: false; error: SttConfigError };

function isOpenAiCompatibleKey(key: string | null | undefined): boolean {
    if (!key?.trim()) return false;
    return key.trim().startsWith("sk-") && !key.trim().startsWith("sk-ant-");
}

/**
 * Resolves STT configuration for a site.
 *
 * Key resolution order:
 * 1. whisper_api_key (dedicated STT key)
 * 2. ai_api_key ONLY if ai_provider === "openai"
 * 3. process.env.OPENAI_API_KEY
 * 4. Error (never use Anthropic key for transcription)
 */
export const resolveSttConfigForSite = cache(
    async (siteId: string): Promise<SttConfigResult> => {
        const aiConfig = await getSiteAiConfig(siteId);
        const sttProvider = resolveServerSttProviderType(aiConfig.speechProvider);

        if (aiConfig.speechProvider === "web-speech") {
            return {
                ok: false,
                error: {
                    error: "Provider non supportato lato server",
                    message:
                        "La trascrizione server-side richiede il provider Whisper. Configuralo in Impostazioni > AI, API & voice.",
                    status: 400,
                },
            };
        }

        if (aiConfig.whisperApiKey?.trim()) {
            return {
                ok: true,
                config: {
                    speechProvider: aiConfig.speechProvider,
                    sttProvider,
                    apiKey: aiConfig.whisperApiKey.trim(),
                },
            };
        }

        if (
            aiConfig.provider === "openai" &&
            isOpenAiCompatibleKey(aiConfig.apiKey)
        ) {
            return {
                ok: true,
                config: {
                    speechProvider: aiConfig.speechProvider,
                    sttProvider,
                    apiKey: aiConfig.apiKey!.trim(),
                },
            };
        }

        const envOpenAiKey = process.env.OPENAI_API_KEY?.trim();
        if (envOpenAiKey && isOpenAiCompatibleKey(envOpenAiKey)) {
            return {
                ok: true,
                config: {
                    speechProvider: aiConfig.speechProvider,
                    sttProvider,
                    apiKey: envOpenAiKey,
                },
            };
        }

        const isAnthropicAi =
            aiConfig.provider === "anthropic" ||
            (aiConfig.apiKey?.startsWith("sk-ant-") ?? false);

        return {
            ok: false,
            error: {
                error: "API key Whisper non configurata",
                message: isAnthropicAi
                    ? "Con provider AI Anthropic serve una API key OpenAI dedicata per Whisper. Configurala in Impostazioni > AI, API & voice > API Key Whisper."
                    : "Per utilizzare Whisper, configura la tua API key OpenAI in Impostazioni > AI, API & voice.",
                status: 400,
            },
        };
    },
);

/**
 * Whether Whisper STT is available for a site (for client-side gating).
 */
export async function isWhisperSttConfigured(siteId: string): Promise<boolean> {
    const result = await resolveSttConfigForSite(siteId);
    return result.ok;
}
