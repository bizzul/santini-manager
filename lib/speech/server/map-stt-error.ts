import { APICallError } from "@ai-sdk/provider";
import { mapAiProviderError } from "@/lib/ai/map-ai-errors";

interface SttProviderError extends Error {
    statusCode?: number;
    responseBody?: string;
}

export function mapSttProviderError(error: unknown): {
    status: number;
    error: string;
    message: string;
} {
    if (error && typeof error === "object" && "statusCode" in error) {
        const sttError = error as SttProviderError;
        const statusCode = sttError.statusCode ?? 500;

        const apiError = new APICallError({
            message: sttError.message,
            url: "https://api.openai.com/v1/audio/transcriptions",
            requestBodyValues: {},
            statusCode,
            responseHeaders: {},
            responseBody: sttError.responseBody,
            isRetryable: statusCode === 429 || statusCode >= 500,
            data: undefined,
        });

        const mapped = mapAiProviderError(apiError);
        return {
            status: mapped.status,
            error: mapped.error,
            message: mapped.message,
        };
    }

    if (error instanceof Error) {
        return {
            status: 500,
            error: "Errore durante la trascrizione",
            message: error.message,
        };
    }

    return {
        status: 500,
        error: "Errore durante la trascrizione",
        message: "Si e' verificato un errore imprevisto durante la trascrizione.",
    };
}
