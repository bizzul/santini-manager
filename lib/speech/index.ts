/**
 * Speech-to-Text Module
 * Provides agnostic speech recognition with multiple provider support
 */

export * from "./types";
export { createWebSpeechProvider } from "./providers/web-speech";
export { createWhisperProvider } from "./providers/whisper";

import type { SpeechProvider, SpeechProviderConfig, SpeechProviderType } from "./types";
import { createWebSpeechProvider } from "./providers/web-speech";
import { createWhisperProvider } from "./providers/whisper";

/**
 * Create a speech provider based on the provider type
 * @param type - The provider type to create
 * @param config - Optional configuration (API keys, etc.)
 * @returns A SpeechProvider instance
 */
export function createSpeechProvider(
    type: SpeechProviderType = "web-speech",
    config?: SpeechProviderConfig
): SpeechProvider {
    switch (type) {
        case "whisper":
            return createWhisperProvider(config);
        case "deepgram":
            // Deepgram provider not yet implemented
            throw new Error("Deepgram provider is not yet implemented");
        case "web-speech":
        default:
            return createWebSpeechProvider(config);
    }
}

/**
 * Check if a speech provider is supported in the current environment
 * @param type - The provider type to check
 * @returns Whether the provider is supported
 */
export function isSpeechProviderSupported(type: SpeechProviderType): boolean {
    try {
        const provider = createSpeechProvider(type);
        return provider.isSupported();
    } catch {
        return false;
    }
}
