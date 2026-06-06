/**
 * Server-side Speech-to-Text provider abstraction.
 * Used by API routes to transcribe audio without exposing API keys to the browser.
 */

export type ServerSttProviderType = "whisper" | "assemblyai" | "deepgram";

export interface ServerSttTranscribeOptions {
    language?: string;
    filename?: string;
}

export interface ServerSttTranscribeResult {
    text: string;
}

export interface ServerSttProvider {
    readonly name: ServerSttProviderType;
    transcribe(
        audio: File | Blob,
        options?: ServerSttTranscribeOptions,
    ): Promise<ServerSttTranscribeResult>;
}

/** Whisper API file size limit is 25 MB; guard slightly below. */
export const WHISPER_MAX_FILE_BYTES = 25 * 1024 * 1024;
export const WHISPER_SAFE_MAX_FILE_BYTES = 24 * 1024 * 1024;
