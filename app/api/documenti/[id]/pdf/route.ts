import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { getSiteDocumentTemplate } from "@/lib/documenti/get-site-document-template";
import { generateDocumentPdfBytes } from "@/lib/documenti/generate-document-pdf";
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

    const { data: doc, error: docError } = await supabase
      .from("documenti")
      .select("*")
      .eq("id", id)
      .eq("site_id", siteId)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: "Documento non trovato" }, { status: 404 });
    }

    const { data: righe } = await supabase
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

    const { bytes, filename } = await generateDocumentPdfBytes({
      documento,
      righe: righe ?? undefined,
      template,
      numero: doc.numero,
      createdAt: doc.created_at,
    });

    const serviceClient = createServiceClient();
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
