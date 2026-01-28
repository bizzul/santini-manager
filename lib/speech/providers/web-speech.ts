/**
 * Web Speech API Provider
 * Free, browser-native speech recognition
 * Supported on: Chrome, Edge, Safari (limited on Firefox)
 */

import type {
    SpeechProvider,
    SpeechProviderConfig,
    SpeechOptions,
    SpeechResult,
    SpeechStatus,
} from "../types";

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onspeechend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

class WebSpeechProvider implements SpeechProvider {
    readonly name = "web-speech" as const;

    private recognition: SpeechRecognition | null = null;
    private resultCallback: ((result: SpeechResult) => void) | null = null;
    private errorCallback: ((error: Error) => void) | null = null;
    private statusCallback: ((status: SpeechStatus) => void) | null = null;
    private currentStatus: SpeechStatus = "idle";

    isSupported(): boolean {
        if (typeof window === "undefined") return false;
        return !!(
            window.SpeechRecognition || window.webkitSpeechRecognition
        );
    }

    initialize(_config?: SpeechProviderConfig): void {
        if (!this.isSupported()) {
            throw new Error(
                "Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari."
            );
        }

        const SpeechRecognitionAPI =
            window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognitionAPI();
    }

    async start(options: SpeechOptions = {}): Promise<void> {
        // First, request microphone permissions explicitly
        // This will trigger the browser's permission prompt
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the stream immediately - we only needed it to request permissions
            stream.getTracks().forEach(track => track.stop());
        } catch (err) {
            this.handleError(new Error(
                "Permesso microfono negato. Consenti l'accesso al microfono nelle impostazioni del browser."
            ));
            return;
        }

        if (!this.recognition) {
            this.initialize();
        }

        if (!this.recognition) {
            this.handleError(new Error("Failed to initialize speech recognition"));
            return;
        }

        const {
            language = "it-IT",
            continuous = true,
            interimResults = true,
        } = options;

        this.recognition.lang = language;
        this.recognition.continuous = continuous;
        this.recognition.interimResults = interimResults;
        this.recognition.maxAlternatives = 1;

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            const lastResultIndex = event.results.length - 1;
            const result = event.results[lastResultIndex];

            if (result && this.resultCallback) {
                this.resultCallback({
                    transcript: result[0].transcript,
                    isFinal: result.isFinal,
                    confidence: result[0].confidence,
                });
            }
        };

        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            // Ignore "no-speech" and "aborted" errors as they're expected
            if (event.error === "no-speech" || event.error === "aborted") {
                return;
            }
            this.handleError(
                new Error(`Speech recognition error: ${event.error}`)
            );
        };

        this.recognition.onstart = () => {
            this.setStatus("recording");
        };

        this.recognition.onend = () => {
            // Only set to idle if we're not in an error state
            if (this.currentStatus !== "error") {
                this.setStatus("idle");
            }
        };

        try {
            this.recognition.start();
        } catch (error) {
            this.handleError(
                error instanceof Error
                    ? error
                    : new Error("Failed to start speech recognition")
            );
        }
    }

    stop(): void {
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch {
                // Ignore errors when stopping (may already be stopped)
            }
        }
        this.setStatus("idle");
    }

    onResult(callback: (result: SpeechResult) => void): void {
        this.resultCallback = callback;
    }

    onError(callback: (error: Error) => void): void {
        this.errorCallback = callback;
    }

    onStatusChange(callback: (status: SpeechStatus) => void): void {
        this.statusCallback = callback;
    }

    destroy(): void {
        this.stop();
        this.recognition = null;
        this.resultCallback = null;
        this.errorCallback = null;
        this.statusCallback = null;
    }

    private setStatus(status: SpeechStatus): void {
        this.currentStatus = status;
        this.statusCallback?.(status);
    }

    private handleError(error: Error): void {
        this.setStatus("error");
        this.errorCallback?.(error);
    }
}

export function createWebSpeechProvider(
    config?: SpeechProviderConfig
): SpeechProvider {
    const provider = new WebSpeechProvider();
    if (config) {
        provider.initialize(config);
    }
    return provider;
}
