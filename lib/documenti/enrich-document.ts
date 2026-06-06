import { assignArtCodes } from "@/lib/documenti/art-codes";
import {
  resolvePrezzoUnitario,
  type ArticoloRowMatch,
} from "@/lib/documenti/articolo-match";
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
  UnitaMisura,
} from "@/validation/documenti/extracted-document";

const ALLOWED_UNITS = ["m1", "Pz.", "h", "mq", "ml", "kg", "forfait"] as const;

function mapCatalogUnit(
  unit: string | null | undefined,
  fallback: UnitaMisura,
): UnitaMisura {
  if (!unit) return fallback;
  const normalized = unit.trim();
  return (ALLOWED_UNITS as readonly string[]).includes(normalized)
    ? (normalized as UnitaMisura)
    : fallback;
}

export function enrichCommercialDocumento(
  documento: AIDocumento,
  clienteMatch?: {
    id: number;
    nome: string;
    via: string | null;
    cap: string | null;
    citta: string | null;
  } | null,
  articoloMatches?: Map<number, ArticoloRowMatch>,
  extra?: {
    allegati?: DocumentoArricchito["allegati"];
    sourceText?: string;
  },
): DocumentoArricchito {
  const artCodes = assignArtCodes(documento.righe);

  const righe = documento.righe.map((riga, index) => {
    const rowMatch = articoloMatches?.get(index);
    const match = rowMatch?.level === "high" ? rowMatch.articolo : null;
    const showDiscount = documento.tipoDocumento !== "FATTURA";
    const sconto = showDiscount ? riga.sconto : null;

    const descrizione = match?.descrizione ?? riga.descrizione;
    const unita = mapCatalogUnit(match?.unita, riga.unita);
    const prezzoUnitario = resolvePrezzoUnitario(
      riga.prezzoUnitario,
      match?.prezzo,
    );

    return {
      ...riga,
      descrizione,
      unita,
      prezzoUnitario,
      sconto,
      articoloId: match?.id ?? null,
      articoloSource: match ? ("sell_product" as const) : ("none" as const),
      isNuovo: !match,
      immagineUrl: match?.immagineUrl ?? null,
      articoliSuggeriti:
        rowMatch?.level === "suggested" ? rowMatch.candidates : undefined,
      art: artCodes[index],
      totaleRiga: calcolaTotaleRiga(
        riga.quantita,
        prezzoUnitario,
        sconto,
        documento.tipoDocumento,
      ),
    };
  });

  const destinatario = clienteMatch
    ? {
        ragioneSociale: clienteMatch.nome,
        aca: documento.destinatario.aca,
        via: clienteMatch.via ?? documento.destinatario.via,
        cap: clienteMatch.cap ?? documento.destinatario.cap,
        citta: clienteMatch.citta ?? documento.destinatario.citta,
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
