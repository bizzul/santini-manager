import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { ANTHROPIC_DEFAULT_MODEL } from "@/lib/ai/anthropic-models";
import type { SupportKbHit } from "@/lib/support/types";
import { formatKbFallbackReply } from "@/lib/support/search";

const ReformulateSchema = z.object({
  mode: z.enum(["answer", "need_ticket"]),
  reply: z.string(),
  articleIds: z.array(z.string()),
});

export type ReformulateResult = z.infer<typeof ReformulateSchema>;

const SYSTEM = `Sei l'assistente di supporto tecnico di FDM (Full Data Manager).
Rispondi SOLO in italiano, in modo breve e operativo.
Usa esclusivamente il contenuto degli articoli forniti: non inventare procedure.
Se gli articoli non coprono la domanda, mode deve essere need_ticket.
Non menzionare soglie, ranking o il fatto di essere un LLM.`;

export async function reformulateKbAnswer(
  query: string,
  hits: SupportKbHit[],
): Promise<ReformulateResult> {
  const fallback: ReformulateResult = {
    mode: hits.length > 0 ? "answer" : "need_ticket",
    reply: formatKbFallbackReply(hits),
    articleIds: hits.map((hit) => hit.id),
  };

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey || hits.length === 0) {
    return fallback;
  }

  try {
    const anthropic = createAnthropic({ apiKey });
    const articles = hits
      .map((hit, index) => {
        const body = hit.bodyMd.slice(0, 4000);
        return `### Articolo ${index + 1} [id=${hit.id}]\n# ${hit.title}\n${body}`;
      })
      .join("\n\n");

    const { object } = await generateObject({
      model: anthropic(ANTHROPIC_DEFAULT_MODEL),
      schema: ReformulateSchema,
      system: SYSTEM,
      prompt: `Domanda utente:\n${query}\n\nArticoli candidati:\n${articles}`,
    });

    const allowed = new Set(hits.map((hit) => hit.id));
    const articleIds = object.articleIds.filter((id) => allowed.has(id));
    return {
      mode: object.mode,
      reply: object.reply.trim() || fallback.reply,
      articleIds: articleIds.length > 0 ? articleIds : fallback.articleIds,
    };
  } catch (error) {
    console.error("[support-reformulate] anthropic failed", error);
    return fallback;
  }
}
