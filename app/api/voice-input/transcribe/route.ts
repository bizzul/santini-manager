import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteAiConfig } from "@/lib/ai/get-site-ai-config";

/**
 * Server-side transcription endpoint using Whisper API
 * This keeps the API key secure on the server
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Check authentication
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get form data with audio file
        const formData = await request.formData();
        const audioFile = formData.get("audio") as File | null;
        const siteId = formData.get("siteId") as string | null;
        const language = (formData.get("language") as string) || "it";

        if (!audioFile) {
            return NextResponse.json(
                { error: "Audio file is required" },
                { status: 400 }
            );
        }

        if (!siteId) {
            return NextResponse.json(
                { error: "Site ID is required" },
                { status: 400 }
            );
        }

        // Get AI configuration for this site
        const aiConfig = await getSiteAiConfig(siteId);

        // Use whisper API key if available, otherwise fall back to AI API key (for OpenAI)
        const whisperApiKey = aiConfig.whisperApiKey || aiConfig.apiKey;

        if (!whisperApiKey) {
            return NextResponse.json(
                {
                    error: "API key non configurata",
                    message:
                        "Per utilizzare Whisper, configura la tua API key OpenAI in Impostazioni > AI & Voice",
                },
                { status: 400 }
            );
        }

        // Forward the audio to OpenAI Whisper API
        const whisperFormData = new FormData();
        whisperFormData.append("file", audioFile, "audio.webm");
        whisperFormData.append("model", "whisper-1");
        whisperFormData.append("language", language);

        const response = await fetch(
            "https://api.openai.com/v1/audio/transcriptions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${whisperApiKey}`,
                },
                body: whisperFormData,
            }
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error("Whisper API error:", error);
            
            if (response.status === 401) {
                return NextResponse.json(
                    { error: "API key non valida" },
                    { status: 401 }
                );
            }
            
            return NextResponse.json(
                { error: error.error?.message || "Errore durante la trascrizione" },
                { status: response.status }
            );
        }

        const data = await response.json();

        return NextResponse.json({
            success: true,
            transcript: data.text,
        });
    } catch (error) {
        console.error("Error in transcription endpoint:", error);
        return NextResponse.json(
            { error: "Errore durante la trascrizione" },
            { status: 500 }
        );
    }
}
