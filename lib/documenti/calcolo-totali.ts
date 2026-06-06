import type { AIRiga } from "@/validation/documenti/extracted-document";
import { getDocumentTypeConfig } from "@/lib/documenti/document-types";

export const IVA_RATE = 0.081;

export interface RigaConTotale {
  totaleRiga: number;
}

export function calcolaTotaleRiga(
  quantita: number,
  prezzoUnitario: number,
  sconto: number | null | undefined,
  tipoDocumento?: string,
): number {
  const showDiscount = getDocumentTypeConfig(tipoDocumento ?? "")?.showDiscount ?? true;
  const scontoEffettivo = showDiscount ? (sconto ?? 0) : 0;
  const moltiplicatore = 1 - scontoEffettivo / 100;
  const totale = quantita * prezzoUnitario * moltiplicatore;
  return roundCurrency(totale);
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calcolaTotaliDocumento(
  righe: Pick<AIRiga, "quantita" | "prezzoUnitario" | "sconto">[],
  tipoDocumento?: string,
): { totNetto: number; iva: number; totaleCHF: number } {
  const totNetto = roundCurrency(
    righe.reduce(
      (sum, riga) =>
        sum +
        calcolaTotaleRiga(
          riga.quantita,
          riga.prezzoUnitario,
          riga.sconto,
          tipoDocumento,
        ),
      0,
    ),
  );
  const iva = roundCurrency(totNetto * IVA_RATE);
  const totaleCHF = roundCurrency(totNetto + iva);
  return { totNetto, iva, totaleCHF };
}
