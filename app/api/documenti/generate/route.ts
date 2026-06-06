import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
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
import {
  buildErrorsFromMappedAiError,
  buildGenerateErrorResponse,
  zodIssuesToErrors,
} from "@/lib/documenti/format-generate-errors";
import { prefetchDocumentToolResults } from "@/lib/documenti/prefetch-tool-results";
import { formatLocalDate } from "@/lib/utils";

export const maxDuration = 60;

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
      const validationErrors = zodIssuesToErrors(parsed.error.errors);
      return NextResponse.json(
        buildGenerateErrorResponse(
          "Validazione fallita",
          "I dati inviati dal form non sono validi",
          validationErrors,
          { details: parsed.error.errors },
        ),
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
        buildGenerateErrorResponse(
          "API key AI non configurata",
          DOCUMENT_AI_CONFIG_MISSING_MESSAGE,
          [DOCUMENT_AI_CONFIG_MISSING_MESSAGE],
        ),
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
        buildGenerateErrorResponse(
          "Configurazione AI non coerente",
          keyValidation.message ?? "Chiave API non valida per il provider",
          [
            keyValidation.message ?? "Chiave API non valida per il provider",
            `Provider configurato: ${aiConfig.provider}`,
            `Modello configurato: ${normalizedModel}`,
          ],
        ),
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
      const { clientesFound, articoliFound, warnings } =
        await prefetchDocumentToolResults(supabase, siteId, input);

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
        prompt: `${userPrompt}\n\nRisultati ricerche database:\n${toolSummary}${
          warnings.length
            ? `\n\nAvvisi ricerche:\n${warnings.join("\n")}`
            : ""
        }`,
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
    const errors = buildErrorsFromMappedAiError(mapped);
    return NextResponse.json(
      buildGenerateErrorResponse(mapped.error, mapped.message, errors, {
        providerErrorType: mapped.providerErrorType,
        providerMessage: mapped.providerMessage,
        statusCode: mapped.statusCode,
      }),
      { status: mapped.status },
    );
  }
}
