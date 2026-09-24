import type {
    ServerSttProvider,
    ServerSttTranscribeOptions,
    ServerSttTranscribeResult,
} from "../types";
import { stripWhisperHallucinations } from "@/lib/speech/domain-vocabulary";

export class WhisperSttProvider implements ServerSttProvider {
    readonly name = "whisper" as const;

    constructor(private readonly apiKey: string) {}

    async transcribe(
        audio: File | Blob,
        options: ServerSttTranscribeOptions = {},
    ): Promise<ServerSttTranscribeResult> {
        const language = options.language || "it";
        const filename = options.filename || "audio.webm";

        const formData = new FormData();
        formData.append("file", audio, filename);
        formData.append("model", "whisper-1");
        formData.append("language", language);
        if (options.vocabularyHint) {
            // Il campo "prompt" di Whisper non viene trascritto: orienta solo il
            // riconoscimento su ortografia di marchi/termini tecnici e nomi propri.
            // Max ~224 token: tenere il vocabolario conciso.
            formData.append("prompt", options.vocabularyHint);
        }

        const response = await fetch(
            "https://api.openai.com/v1/audio/transcriptions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: formData,
            },
        );

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const message =
                (errorBody as { error?: { message?: string } })?.error?.message ||
                "Errore durante la trascrizione Whisper";

            const err = new Error(message) as Error & {
                statusCode?: number;
                responseBody?: string;
            };
            err.statusCode = response.status;
            err.responseBody = JSON.stringify(errorBody);
            throw err;
        }

        const data = (await response.json()) as { text?: string };
        const rawText = data.text?.trim() || "";

        return {
            text: stripWhisperHallucinations(rawText),
        };
    }
}

export function createWhisperSttProvider(apiKey: string): WhisperSttProvider {
    return new WhisperSttProvider(apiKey);
}
