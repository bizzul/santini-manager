import type { ServerSttProvider, ServerSttProviderType } from "./types";
import { createWhisperSttProvider } from "./providers/whisper";

export * from "./types";
export { createWhisperSttProvider } from "./providers/whisper";

export function createServerSttProvider(
    type: ServerSttProviderType,
    apiKey: string,
): ServerSttProvider {
    switch (type) {
        case "whisper":
            return createWhisperSttProvider(apiKey);
        case "assemblyai":
            throw new Error("AssemblyAI provider non ancora implementato");
        case "deepgram":
            throw new Error("Deepgram provider non ancora implementato");
        default:
            throw new Error(`Provider STT sconosciuto: ${type as string}`);
    }
}

/**
 * Maps site speech_provider setting to a server STT provider type.
 * web-speech is browser-only; server defaults to whisper when cloud STT is needed.
 */
export function resolveServerSttProviderType(
    speechProvider: string,
): ServerSttProviderType {
    if (speechProvider === "deepgram") {
        return "deepgram";
    }

    return "whisper";
}
