/**
 * OpenAI Whisper API Provider (Stub)
 * High-accuracy cloud-based speech recognition
 * Requires OpenAI API key
 *
 * This is a stub implementation - to be completed when needed
 */

import type {
    SpeechProvider,
    SpeechProviderConfig,
    SpeechOptions,
    SpeechResult,
    SpeechStatus,
} from "../types";

class WhisperProvider implements SpeechProvider {
    readonly name = "whisper" as const;

    private apiKey: string | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private resultCallback: ((result: SpeechResult) => void) | null = null;
    private errorCallback: ((error: Error) => void) | null = null;
    private statusCallback: ((status: SpeechStatus) => void) | null = null;

    isSupported(): boolean {
        if (typeof window === "undefined") return false;
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    initialize(config?: SpeechProviderConfig): void {
        if (!config?.apiKey) {
            throw new Error("Whisper provider requires an API key");
        }
        this.apiKey = config.apiKey;
    }

    async start(options: SpeechOptions = {}): Promise<void> {
        if (!this.apiKey) {
            this.handleError(new Error("Whisper API key not configured"));
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            this.audioChunks = [];
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: "audio/webm",
            });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                this.setStatus("processing");
                await this.transcribeAudio(options.language || "it");
            };

            this.mediaRecorder.start();
            this.setStatus("recording");
        } catch (error) {
            this.handleError(
                error instanceof Error
                    ? error
                    : new Error("Failed to access microphone")
            );
        }
    }

    stop(): void {
        if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
            this.mediaRecorder.stop();
            // Stop all tracks to release microphone
            this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        }
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
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.resultCallback = null;
        this.errorCallback = null;
        this.statusCallback = null;
    }

    private async transcribeAudio(language: string): Promise<void> {
        if (!this.apiKey) return;

        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });

        try {
            const formData = new FormData();
            formData.append("file", audioBlob, "audio.webm");
            formData.append("model", "whisper-1");
            formData.append("language", language);

            const response = await fetch(
                "https://api.openai.com/v1/audio/transcriptions",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                    },
                    body: formData,
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(
                    error.error?.message || "Failed to transcribe audio"
                );
            }

            const data = await response.json();

            this.resultCallback?.({
                transcript: data.text,
                isFinal: true,
                confidence: 1, // Whisper doesn't return confidence scores
            });

            this.setStatus("idle");
        } catch (error) {
            this.handleError(
                error instanceof Error
                    ? error
                    : new Error("Transcription failed")
            );
        }
    }

    private setStatus(status: SpeechStatus): void {
        this.statusCallback?.(status);
    }

    private handleError(error: Error): void {
        this.setStatus("error");
        this.errorCallback?.(error);
    }
}

export function createWhisperProvider(
    config?: SpeechProviderConfig
): SpeechProvider {
    const provider = new WhisperProvider();
    if (config) {
        provider.initialize(config);
    }
    return provider;
}
