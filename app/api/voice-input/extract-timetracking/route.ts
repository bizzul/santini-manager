import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { getSiteAiConfig } from "@/lib/ai/get-site-ai-config";
import { ExtractedTimetrackingSchema } from "@/validation/voice-input/extracted-timetracking";

const SYSTEM_PROMPT = `Sei un assistente per l'estrazione di dati di registrazione ore da trascrizioni vocali.

Estrai dalla trascrizione:
- activityType: "project" se menziona un progetto/codice progetto (es. 25-090, progetto X), "internal" se menziona attività interna/ufficio/riunione
- projectCode: codice progetto se menzionato (es. "25-090", "26-011"), null altrimenti
- hours: ore intere (0-24)
- minutes: minuti (0-59)
- description: descrizione attività se menzionata
- internalActivity: tipo attività interna se menzionata (es. "ufficio", "riunione"), null per progetti

Esempi:
- "2 ore sul progetto 25-090" → project, "25-090", 2, 0
- "1 ora e 30 minuti attività interna ufficio" → internal, null, 1, 30, null, "ufficio"
- "30 minuti su 26-011 montaggio" → project, "26-011", 0, 30, "montaggio"
- "4 ore progetto pedrioli" → project, cerca "pedrioli" nei progetti, 4, 0`;

function createModelFromConfig(config: {
  provider: string;
  apiKey: string;
  model: string;
}) {
  switch (config.provider) {
    case "anthropic":
      return createAnthropic({ apiKey: config.apiKey })(config.model);
    case "openai":
    default:
      return createOpenAI({ apiKey: config.apiKey })(config.model);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { transcript, siteId } = body;
    if (!transcript || !siteId) {
      return NextResponse.json(
        { error: "transcript e siteId richiesti" },
        { status: 400 }
      );
    }

    const aiConfig = await getSiteAiConfig(siteId);
    if (!aiConfig.apiKey) {
      return NextResponse.json(
        {
          error: "API key AI non configurata",
          message: "Configura la API key in Impostazioni > AI & Voice",
        },
        { status: 400 }
      );
    }

    const model = createModelFromConfig({
      provider: aiConfig.provider,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
    });

    const { object } = await generateObject({
      model,
      schema: z.object({ registrazione: ExtractedTimetrackingSchema }),
      system: SYSTEM_PROMPT,
      prompt: `Trascrizione vocale:
---
${transcript}
---

Estrai i dati della registrazione ore.`,
    });

    return NextResponse.json({
      success: true,
      registrazione: object.registrazione,
    });
  } catch (error) {
    console.error("Error extracting timetracking:", error);
    return NextResponse.json(
      { error: "Errore durante l'estrazione" },
      { status: 500 }
    );
  }
}
