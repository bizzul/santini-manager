import { assignArtCodes } from "@/lib/documenti/art-codes";
import {
  calcolaTotaleRiga,
  calcolaTotaliDocumento,
} from "@/lib/documenti/calcolo-totali";
import { isCommercialType } from "@/lib/documenti/document-types";
import type {
  AIDocumento,
  DestinatarioInput,
  DocumentoArricchito,
  GeneratedLetter,
} from "@/validation/documenti/extracted-document";

export function enrichCommercialDocumento(
  documento: AIDocumento,
  clienteMatch?: {
    id: number;
    nome: string;
    via: string | null;
    cap: string | null;
    citta: string | null;
  } | null,
  articoloMatches?: Map<
    number,
    {
      id: string | number;
      source: "sell_product" | "inventory";
    } | null
  >,
  extra?: {
    allegati?: DocumentoArricchito["allegati"];
    sourceText?: string;
  },
): DocumentoArricchito {
  const artCodes = assignArtCodes(documento.righe);

  const righe = documento.righe.map((riga, index) => {
    const match = articoloMatches?.get(index);
    const showDiscount =
      documento.tipoDocumento !== "FATTURA";
    const sconto = showDiscount ? riga.sconto : null;

    return {
      ...riga,
      sconto,
      articoloId: match?.id ?? null,
      articoloSource: match?.source ?? ("none" as const),
      isNuovo: !match,
      art: artCodes[index],
      totaleRiga: calcolaTotaleRiga(
        riga.quantita,
        riga.prezzoUnitario,
        sconto,
        documento.tipoDocumento,
      ),
    };
  });

  const destinatario = clienteMatch
    ? {
        ragioneSociale:
          documento.destinatario.ragioneSociale || clienteMatch.nome,
        aca: documento.destinatario.aca,
        via: documento.destinatario.via ?? clienteMatch.via,
        cap: documento.destinatario.cap ?? clienteMatch.cap,
        citta: documento.destinatario.citta ?? clienteMatch.citta,
        clienteId: clienteMatch.id,
        fornitoreId: null,
        isNuovo: false,
        email: null,
      }
    : {
        ...documento.destinatario,
        clienteId: null,
        fornitoreId: null,
        isNuovo: true,
        email: null,
      };

  const totali = isCommercialType(documento.tipoDocumento)
    ? calcolaTotaliDocumento(righe, documento.tipoDocumento)
    : undefined;

  return {
    tipoDocumento: documento.tipoDocumento,
    destinatario,
    oggetto: documento.oggetto,
    righe,
    condizioniPagamento: documento.condizioniPagamento,
    termineFornitura: documento.termineFornitura,
    note: documento.note,
    corpoTesto: null,
    totali,
    allegati: extra?.allegati,
  };
}

export function enrichLetterDocumento(
  letter: GeneratedLetter,
  destInput: DestinatarioInput,
  extra?: {
    allegati?: DocumentoArricchito["allegati"];
  },
): DocumentoArricchito {
  return {
    tipoDocumento: letter.tipoDocumento,
    destinatario: {
      ragioneSociale: letter.destinatario.ragioneSociale,
      aca: letter.destinatario.aca,
      via: letter.destinatario.via ?? destInput.via ?? null,
      cap: letter.destinatario.cap ?? destInput.cap ?? null,
      citta: letter.destinatario.citta ?? destInput.citta ?? null,
      clienteId:
        destInput.tipo === "cliente" ? (destInput.entityId ?? null) : null,
      fornitoreId:
        destInput.tipo === "fornitore" ? (destInput.entityId ?? null) : null,
      isNuovo: !destInput.entityId,
      email: destInput.email ?? null,
    },
    oggetto: letter.oggetto,
    corpoTesto: letter.corpoTesto,
    righe: [],
    condizioniPagamento: [],
    termineFornitura: null,
    note: letter.note,
    allegati: extra?.allegati,
  };
}

/** @deprecated use enrichCommercialDocumento */
export function enrichDocumento(
  documento: AIDocumento,
  clienteMatch?: Parameters<typeof enrichCommercialDocumento>[1],
  articoloMatches?: Parameters<typeof enrichCommercialDocumento>[2],
): DocumentoArricchito {
  return enrichCommercialDocumento(documento, clienteMatch, articoloMatches);
}
