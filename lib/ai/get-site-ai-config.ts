import { createClient } from "@/utils/supabase/server";
import { cache } from "react";

export type AiProvider = "openai" | "anthropic" | "google";
export type SpeechProvider = "web-speech" | "whisper" | "deepgram";

export interface SiteAiConfig {
    provider: AiProvider;
    apiKey: string | null;
    model: string;
    speechProvider: SpeechProvider;
    whisperApiKey: string | null;
}

/**
 * Get AI configuration for a site
 * Falls back to environment variables if site doesn't have custom config
 */
export const getSiteAiConfig = cache(
    async (siteId: string): Promise<SiteAiConfig> => {
        const supabase = await createClient();

        const { data: settings } = await supabase
            .from("site_ai_settings")
            .select("*")
            .eq("site_id", siteId)
            .single();

        // Default configuration with env fallbacks
        const defaultConfig: SiteAiConfig = {
            provider: "openai",
            apiKey: process.env.OPENAI_API_KEY || null,
            model: "gpt-4o-mini",
            speechProvider: "web-speech",
            whisperApiKey: null,
        };

        if (!settings) {
            return defaultConfig;
        }

        return {
            provider: (settings.ai_provider as AiProvider) || defaultConfig.provider,
            apiKey: settings.ai_api_key || defaultConfig.apiKey,
            model: settings.ai_model || defaultConfig.model,
            speechProvider:
                (settings.speech_provider as SpeechProvider) ||
                defaultConfig.speechProvider,
            whisperApiKey: settings.whisper_api_key || null,
        };
    }
);

/**
 * Get AI configuration by domain
 */
export async function getSiteAiConfigByDomain(
    domain: string
): Promise<SiteAiConfig> {
    const supabase = await createClient();

    // First get the site ID from domain
    const { data: site } = await supabase
        .from("sites")
        .select("id")
        .eq("domain", domain)
        .single();

    if (!site) {
        // Return default config with env fallbacks
        return {
            provider: "openai",
            apiKey: process.env.OPENAI_API_KEY || null,
            model: "gpt-4o-mini",
            speechProvider: "web-speech",
            whisperApiKey: null,
        };
    }

    return getSiteAiConfig(site.id);
}

/**
 * Check if a site has AI configured (has API key)
 */
export async function isSiteAiConfigured(siteId: string): Promise<boolean> {
    const config = await getSiteAiConfig(siteId);
    return !!config.apiKey;
}

/**
 * Get public AI settings (without exposing full API keys)
 * Used for client-side display
 */
export interface PublicSiteAiSettings {
    aiProvider: AiProvider;
    aiModel: string;
    speechProvider: SpeechProvider;
    hasAiApiKey: boolean;
    hasWhisperApiKey: boolean;
}

export async function getPublicSiteAiSettings(
    siteId: string
): Promise<PublicSiteAiSettings> {
    const config = await getSiteAiConfig(siteId);

    return {
        aiProvider: config.provider,
        aiModel: config.model,
        speechProvider: config.speechProvider,
        hasAiApiKey: !!config.apiKey,
        hasWhisperApiKey: !!config.whisperApiKey,
    };
}
