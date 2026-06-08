import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { getSiteDocumentTemplate } from "@/lib/documenti/get-site-document-template";
import { generateDocumentPdfBytes } from "@/lib/documenti/generate-document-pdf";
import { generatePdfmeDocumentBytes } from "@/lib/documenti/generate-pdfme-pdf";
import { hasPdfmeOverlay } from "@/lib/documenti/default-pdfme-template";
import { savePdfToProjectDocuments } from "@/lib/documenti/save-pdf-to-project-documents";
import { updateDocumentPdfPaths } from "@/lib/documenti/save-document";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";
import { mapAiProviderError } from "@/lib/ai/map-ai-errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteDomain = req.headers.get("x-site-domain");
    let siteId: string | null = null;

    if (siteDomain) {
      const context = await getSiteContextFromDomain(siteDomain);
      siteId = context.siteId;
    } else {
      const context = await getSiteContext(req);
      siteId = context.siteId;
    }

    if (!siteId) {
      return NextResponse.json({ error: "Site ID required" }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    const { data: doc, error: docError } = await serviceClient
      .from("documenti")
      .select("*")
      .eq("id", id)
      .eq("site_id", siteId)
      .single();

    if (docError || !doc) {
      console.error("[DocumentiPDF] Documento non trovato:", {
        id,
        siteId,
        docError: docError?.message,
      });
      return NextResponse.json(
        {
          error: "Documento non trovato",
          message:
            "Il documento salvato non è leggibile per questo sito. Verifica i permessi o riprova il salvataggio.",
          errors: [
            `Documento ID: ${id}`,
            `Site ID: ${siteId}`,
            docError?.message
              ? `Dettaglio database: ${docError.message}`
              : "Nessun record trovato con questo ID nel sito corrente.",
          ],
        },
        { status: 404 },
      );
    }

    const { data: righe } = await serviceClient
      .from("righe_documento")
      .select("*")
      .eq("documento_id", id)
      .order("posizione", { ascending: true });

    const template = await getSiteDocumentTemplate(siteId);

    const documento: DocumentoArricchito = {
      tipoDocumento: doc.tipo_documento,
      destinatario: {
        ...(doc.destinatario as DocumentoArricchito["destinatario"]),
        clienteId: doc.cliente_id,
        isNuovo: false,
      },
      oggetto: doc.oggetto ?? "",
      corpoTesto: doc.corpo_testo,
      righe: (righe ?? []).map((r) => ({
        descrizione: r.descrizione,
        misure: r.misure,
        unita: r.unita,
        quantita: Number(r.quantita),
        prezzoUnitario: Number(r.prezzo_unitario),
        sconto: r.sconto != null ? Number(r.sconto) : null,
        isTrasporto: r.is_trasporto,
        articoloId: r.articolo_id,
        isNuovo: false,
        art: r.art,
        totaleRiga: r.totale_riga != null ? Number(r.totale_riga) : undefined,
        immagineUrl: r.immagine_url ?? null,
      })),
      condizioniPagamento: doc.condizioni_pagamento ?? [],
      termineFornitura: doc.termine_fornitura,
      note: doc.note,
      totali:
        doc.tot_netto != null
          ? {
              totNetto: Number(doc.tot_netto),
              iva: Number(doc.iva),
              totaleCHF: Number(doc.totale_chf),
            }
          : undefined,
      allegati: doc.allegati ?? [],
    };

    const { bytes, filename } = hasPdfmeOverlay(template)
      ? await generatePdfmeDocumentBytes({
          documento,
          template,
          numero: doc.numero,
          createdAt: doc.created_at,
        })
      : await generateDocumentPdfBytes({
          documento,
          righe: righe ?? undefined,
          template,
          numero: doc.numero,
          createdAt: doc.created_at,
        });

    const storagePath = `${siteId}/documenti/${id}/${filename}`;

    const { error: uploadError } = await serviceClient.storage
      .from("documents")
      .upload(storagePath, Buffer.from(bytes), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const {
      data: { publicUrl },
    } = serviceClient.storage.from("documents").getPublicUrl(storagePath);

    await updateDocumentPdfPaths(
      serviceClient,
      id,
      siteId,
      publicUrl,
      storagePath,
    );

    if (siteDomain) {
      revalidatePath(`/sites/${siteDomain}/documenti`);
    }

    if (doc.task_id) {
      try {
        await savePdfToProjectDocuments({
          supabase: serviceClient,
          siteId,
          taskId: doc.task_id,
          filename,
          pdfBytes: bytes,
        });
      } catch (projectError) {
        console.error(
          "[DocumentiPDF] Salvataggio PDF nei documenti di progetto fallito:",
          {
            documentoId: id,
            taskId: doc.task_id,
            error:
              projectError instanceof Error
                ? projectError.message
                : projectError,
          },
        );
      }
    }

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    const mapped = mapAiProviderError(error);
    return NextResponse.json(
      {
        error: mapped.error ?? "Errore nella generazione del PDF",
        message: mapped.message,
      },
      { status: mapped.status ?? 500 },
    );
  }
}
