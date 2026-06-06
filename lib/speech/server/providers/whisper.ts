import type {
    ServerSttProvider,
    ServerSttTranscribeOptions,
    ServerSttTranscribeResult,
} from "../types";

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

        return {
            text: data.text?.trim() || "",
        };
    }
}

export function createWhisperSttProvider(apiKey: string): WhisperSttProvider {
    return new WhisperSttProvider(apiKey);
}
