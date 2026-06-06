import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { resolveSttConfigForSite } from "@/lib/ai/resolve-stt-config";
import {
    createServerSttProvider,
    WHISPER_SAFE_MAX_FILE_BYTES,
} from "@/lib/speech/server";
import { mapSttProviderError } from "@/lib/speech/server/map-stt-error";

/**
 * Server-side transcription endpoint.
 * Audio -> text via configured STT provider (Whisper by default).
 * API keys are never exposed to the browser.
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const audioFile = formData.get("audio") as File | null;
        const siteId = formData.get("siteId") as string | null;
        const language = (formData.get("language") as string) || "it";

        if (!audioFile) {
            return NextResponse.json(
                { error: "Audio file is required" },
                { status: 400 },
            );
        }

        if (!siteId) {
            return NextResponse.json(
                { error: "Site ID is required" },
                { status: 400 },
            );
        }

        if (audioFile.size > WHISPER_SAFE_MAX_FILE_BYTES) {
            return NextResponse.json(
                {
                    error: "File audio troppo grande",
                    message:
                        "Il file supera il limite di 25 MB di Whisper. Registra un audio piu' breve o comprimi il file.",
                },
                { status: 413 },
            );
        }

        const sttResult = await resolveSttConfigForSite(siteId);
        if (!sttResult.ok) {
            return NextResponse.json(
                {
                    error: sttResult.error.error,
                    message: sttResult.error.message,
                },
                { status: sttResult.error.status },
            );
        }

        const { config } = sttResult;
        const provider = createServerSttProvider(
            config.sttProvider,
            config.apiKey,
        );

        const { text } = await provider.transcribe(audioFile, {
            language,
            filename: audioFile.name || "audio.webm",
        });

        if (!text) {
            return NextResponse.json(
                {
                    error: "Trascrizione vuota",
                    message:
                        "Non e' stato possibile estrarre testo dall'audio. Riprova parlando piu' chiaramente.",
                },
                { status: 422 },
            );
        }

        return NextResponse.json({
            success: true,
            transcript: text,
        });
    } catch (error) {
        console.error("Error in transcription endpoint:", error);

        const mapped = mapSttProviderError(error);
        return NextResponse.json(
            {
                error: mapped.error,
                message: mapped.message,
            },
            { status: mapped.status },
        );
    }
}
