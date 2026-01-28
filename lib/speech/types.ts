/**
 * Speech-to-Text Provider Abstraction
 * Allows switching between different speech recognition providers
 */

export type SpeechStatus = "idle" | "recording" | "processing" | "error";

export type SpeechProviderType = "web-speech" | "whisper" | "deepgram";

export interface SpeechResult {
    transcript: string;
    isFinal: boolean;
    confidence?: number;
}

export interface SpeechOptions {
    /** Language code (default: "it-IT") */
    language?: string;
    /** Continue listening after results (default: true) */
    continuous?: boolean;
    /** Return interim results while speaking (default: true) */
    interimResults?: boolean;
}

export interface SpeechProviderConfig {
    /** API key for cloud-based providers (Whisper, Deepgram) */
    apiKey?: string;
}

export interface SpeechProvider {
    /** Provider name for identification */
    readonly name: SpeechProviderType;

    /** Check if the provider is supported in the current environment */
    isSupported(): boolean;

    /** Initialize the provider with optional config */
    initialize(config?: SpeechProviderConfig): void;

    /** Start speech recognition (may be async to request permissions) */
    start(options?: SpeechOptions): void | Promise<void>;

    /** Stop speech recognition */
    stop(): void;

    /** Register callback for speech results */
    onResult(callback: (result: SpeechResult) => void): void;

    /** Register callback for errors */
    onError(callback: (error: Error) => void): void;

    /** Register callback for status changes */
    onStatusChange(callback: (status: SpeechStatus) => void): void;

    /** Clean up resources */
    destroy(): void;
}

/** Factory function type for creating providers */
export type SpeechProviderFactory = (
    config?: SpeechProviderConfig
) => SpeechProvider;
