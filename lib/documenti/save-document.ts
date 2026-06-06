import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calcolaTotaleRiga,
  calcolaTotaliDocumento,
} from "@/lib/documenti/calcolo-totali";
import { assignArtCodes } from "@/lib/documenti/art-codes";
import { generateDocumentNumber } from "@/lib/documenti/generate-document-number";
import { getDocumentTypeConfig, isCommercialType } from "@/lib/documenti/document-types";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";

export interface SavedDocumentResult {
  id: string;
  numero: string;
  anno: number;
}

export async function saveDocumento(
  supabase: SupabaseClient,
  siteId: string,
  documento: DocumentoArricchito,
  options?: {
    sourceText?: string;
    taskId?: number | null;
    status?: "draft" | "final";
    documentoId?: string;
  },
): Promise<SavedDocumentResult> {
  const typeConfig = getDocumentTypeConfig(documento.tipoDocumento);
  const isCommercial = isCommercialType(documento.tipoDocumento);

  let righeConTotali = documento.righe;
  let totali = documento.totali;

  if (isCommercial) {
    const artCodes = assignArtCodes(documento.righe);
    righeConTotali = documento.righe.map((riga, index) => {
      const showDiscount = typeConfig?.showDiscount ?? true;
      const sconto = showDiscount ? riga.sconto : null;
      return {
        ...riga,
        art: artCodes[index],
        sconto,
        totaleRiga: calcolaTotaleRiga(
          riga.quantita,
          riga.prezzoUnitario,
          sconto,
          documento.tipoDocumento,
        ),
      };
    });
    totali = calcolaTotaliDocumento(righeConTotali, documento.tipoDocumento);
  }

  const status = options?.status ?? "final";
  let numero: string | null = null;
  let anno: number | null = null;

  if (options?.documentoId) {
    const { data: existing } = await supabase
      .from("documenti")
      .select("numero, anno")
      .eq("id", options.documentoId)
      .eq("site_id", siteId)
      .single();
    numero = existing?.numero ?? null;
    anno = existing?.anno ?? null;
  } else if (status === "final" && (typeConfig?.hasNumber ?? true)) {
    const generated = await generateDocumentNumber(siteId);
    numero = generated.numero;
    anno = generated.anno;
  }

  const payload = {
    site_id: siteId,
    task_id: options?.taskId ?? null,
    tipo_documento: documento.tipoDocumento,
    numero,
    anno,
    cliente_id: documento.destinatario.clienteId,
    destinatario: {
      ragioneSociale: documento.destinatario.ragioneSociale,
      aca: documento.destinatario.aca,
      via: documento.destinatario.via,
      cap: documento.destinatario.cap,
      citta: documento.destinatario.citta,
      email: documento.destinatario.email ?? null,
      fornitoreId: documento.destinatario.fornitoreId ?? null,
    },
    oggetto: documento.oggetto,
    corpo_testo: documento.corpoTesto ?? null,
    condizioni_pagamento: documento.condizioniPagamento ?? [],
    termine_fornitura: documento.termineFornitura ?? null,
    note: documento.note ?? null,
    tot_netto: totali?.totNetto ?? null,
    iva: totali?.iva ?? null,
    totale_chf: totali?.totaleCHF ?? null,
    source_text: options?.sourceText ?? null,
    allegati: documento.allegati ?? [],
    status,
  };

  let savedRow: { id: string; numero: string | null; anno: number | null };

  if (options?.documentoId) {
    const { data: updated, error } = await supabase
      .from("documenti")
      .update(payload)
      .eq("id", options.documentoId)
      .eq("site_id", siteId)
      .select("id, numero, anno")
      .single();

    if (error || !updated) {
      throw new Error(error?.message ?? "Aggiornamento documento fallito");
    }

    savedRow = updated;
    await supabase
      .from("righe_documento")
      .delete()
      .eq("documento_id", updated.id);
  } else {
    const { data: inserted, error: docError } = await supabase
      .from("documenti")
      .insert(payload)
      .select("id, numero, anno")
      .single();

    if (docError || !inserted) {
      throw new Error(docError?.message ?? "Creazione documento fallita");
    }

    savedRow = inserted;
  }

  if (isCommercial && righeConTotali.length > 0) {
    const righePayload = righeConTotali.map((riga, index) => ({
      documento_id: savedRow.id,
      site_id: siteId,
      posizione: index + 1,
      art: riga.art,
      descrizione: riga.descrizione,
      misure: riga.misure,
      unita: riga.unita,
      quantita: riga.quantita,
      prezzo_unitario: riga.prezzoUnitario,
      sconto: riga.sconto,
      totale_riga: riga.totaleRiga,
      articolo_id: riga.articoloId != null ? String(riga.articoloId) : null,
      articolo_source:
        riga.articoloSource && riga.articoloSource !== "none"
          ? riga.articoloSource
          : null,
      is_trasporto: riga.isTrasporto,
    }));

    const { error: righeError } = await supabase
      .from("righe_documento")
      .insert(righePayload);

    if (righeError) {
      if (!options?.documentoId) {
        await supabase.from("documenti").delete().eq("id", savedRow.id);
      }
      throw new Error(righeError.message);
    }
  }

  return {
    id: savedRow.id,
    numero: savedRow.numero ?? "",
    anno: savedRow.anno ?? new Date().getFullYear(),
  };
}

export async function updateDocumentPdfPaths(
  supabase: SupabaseClient,
  documentoId: string,
  siteId: string,
  pdfUrl: string,
  pdfStoragePath: string,
): Promise<void> {
  const { error } = await supabase
    .from("documenti")
    .update({ pdf_url: pdfUrl, pdf_storage_path: pdfStoragePath })
    .eq("id", documentoId)
    .eq("site_id", siteId);

  if (error) {
    throw new Error(error.message);
  }
}
