import { NextRequest, NextResponse } from "next/server";
import { generateObject, generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import {
  AIDocumentoSchema,
  GeneratedLetterSchema,
  GenerateDocumentRequestSchema,
} from "@/validation/documenti/extracted-document";
import {
  buildGenerateSystemPrompt,
  buildGenerateUserPrompt,
} from "@/lib/documenti/generate-prompt";
import {
  cercaArticolo,
  cercaCliente,
  type ArticoloMatch,
  type ClienteMatch,
} from "@/lib/documenti/search-tools";
import {
  enrichCommercialDocumento,
  enrichLetterDocumento,
} from "@/lib/documenti/enrich-document";
import { resolveMatchesFromToolResults } from "@/lib/documenti/match-from-tools";
import {
  DOCUMENT_AI_CONFIG_MISSING_MESSAGE,
  resolveAiConfigForDocuments,
} from "@/lib/ai/resolve-ai-config";
import { getSiteDocumentTemplate } from "@/lib/documenti/get-site-document-template";
import {
  createModelFromAiConfig,
  normalizeAiModelId,
} from "@/lib/documenti/get-document-ai-model";
import { mapAiProviderError } from "@/lib/ai/map-ai-errors";
import {
  logDocumentAiConfig,
  logDocumentAiError,
} from "@/lib/ai/log-ai-config";
import { validateAiApiKeyForProvider } from "@/lib/ai/validate-api-key";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { isCommercialType } from "@/lib/documenti/document-types";
import { formatLocalDate } from "@/lib/utils";

export async function POST(request: NextRequest) {
  let resolvedAiConfig: Awaited<
    ReturnType<typeof resolveAiConfigForDocuments>
  > = null;

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteDomain = request.headers.get("x-site-domain");
    let siteId: string | null = null;

    if (siteDomain) {
      const context = await getSiteContextFromDomain(siteDomain);
      siteId = context.siteId;
    } else {
      const context = await getSiteContext(request);
      siteId = context.siteId;
    }

    if (!siteId) {
      return NextResponse.json({ error: "Site ID required" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = GenerateDocumentRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validazione fallita", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const [aiConfig, siteTemplate] = await Promise.all([
      resolveAiConfigForDocuments(siteId),
      getSiteDocumentTemplate(siteId),
    ]);
    resolvedAiConfig = aiConfig;

    if (!aiConfig) {
      return NextResponse.json(
        {
          error: "API key AI non configurata",
          message: DOCUMENT_AI_CONFIG_MISSING_MESSAGE,
        },
        { status: 400 },
      );
    }

    const normalizedModel = normalizeAiModelId(
      aiConfig.model,
      aiConfig.provider,
    );
    logDocumentAiConfig(
      { ...aiConfig, model: normalizedModel },
      `tipo=${input.tipoDocumento}`,
    );

    const keyValidation = validateAiApiKeyForProvider(
      aiConfig.provider,
      aiConfig.apiKey,
    );
    if (!keyValidation.valid) {
      return NextResponse.json(
        {
          error: "Configurazione AI non coerente",
          message: keyValidation.message,
          provider: aiConfig.provider,
          model: aiConfig.model,
        },
        { status: 400 },
      );
    }

    const model = createModelFromAiConfig(aiConfig);
    const today = formatLocalDate(new Date());
    const systemPrompt = buildGenerateSystemPrompt(
      input.tipoDocumento,
      siteTemplate,
    );
    const userPrompt = buildGenerateUserPrompt(input, today);

    if (isCommercialType(input.tipoDocumento)) {
      const clientesFound = new Map<string, ClienteMatch[]>();
      const articoliFound = new Map<string, ArticoloMatch[]>();

      await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        tools: {
          cerca_cliente: tool({
            description: "Cerca clienti esistenti nel database",
            inputSchema: z.object({ query: z.string() }),
            execute: async ({ query }) => {
              const results = await cercaCliente(supabase, siteId!, query);
              clientesFound.set(query, results);
              return { trovati: results.length, risultati: results };
            },
          }),
          cerca_articolo: tool({
            description: "Cerca articoli nel listino o inventario",
            inputSchema: z.object({ query: z.string() }),
            execute: async ({ query }) => {
              const results = await cercaArticolo(supabase, siteId!, query);
              articoliFound.set(query, results);
              return { trovati: results.length, risultati: results };
            },
          }),
        },
        stopWhen: stepCountIs(10),
      });

      const toolSummary = JSON.stringify(
        {
          clienti: Object.fromEntries(clientesFound),
          articoli: Object.fromEntries(articoliFound),
        },
        null,
        2,
      );

      const { object: documento } = await generateObject({
        model,
        schema: AIDocumentoSchema,
        system: systemPrompt,
        prompt: `${userPrompt}\n\nRisultati ricerche database:\n${toolSummary}`,
      });

      documento.tipoDocumento = input.tipoDocumento;

      const { clienteMatch, articoloMatches } = resolveMatchesFromToolResults(
        documento,
        clientesFound,
        articoliFound,
      );

      const enriched = enrichCommercialDocumento(
        documento,
        input.destinatario.entityId && input.destinatario.tipo === "cliente"
          ? {
              id: input.destinatario.entityId,
              nome: input.destinatario.ragioneSociale,
              via: input.destinatario.via ?? null,
              cap: input.destinatario.cap ?? null,
              citta: input.destinatario.citta ?? null,
            }
          : clienteMatch,
        articoloMatches,
        { allegati: input.allegati, sourceText: input.testo },
      );

      enriched.destinatario.email = input.destinatario.email ?? null;
      if (input.destinatario.entityId) {
        enriched.destinatario.isNuovo = false;
        if (input.destinatario.tipo === "cliente") {
          enriched.destinatario.clienteId = input.destinatario.entityId;
        }
        if (input.destinatario.tipo === "fornitore") {
          enriched.destinatario.fornitoreId = input.destinatario.entityId;
        }
      }

      return NextResponse.json({ success: true, documento: enriched });
    }

    const { object: letter } = await generateObject({
      model,
      schema: GeneratedLetterSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    letter.tipoDocumento = input.tipoDocumento;

    const enriched = enrichLetterDocumento(letter, input.destinatario, {
      allegati: input.allegati,
    });

    return NextResponse.json({ success: true, documento: enriched });
  } catch (error) {
    if (resolvedAiConfig) {
      logDocumentAiError(error, resolvedAiConfig);
    } else {
      console.error("[DocumentiGenerate] Error generating document:", error);
    }

    const mapped = mapAiProviderError(error);
    return NextResponse.json(
      {
        error: mapped.error,
        message: mapped.message,
        providerErrorType: mapped.providerErrorType,
        providerMessage: mapped.providerMessage,
        statusCode: mapped.statusCode,
      },
      { status: mapped.status },
    );
  }
}
