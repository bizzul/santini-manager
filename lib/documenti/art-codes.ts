import type { AIRiga } from "@/validation/documenti/extracted-document";

/**
 * Assegna codici Art. posizionali (HO-01, HO-02, TR-01) alle righe.
 * TR-01 e' riservato alle righe con isTrasporto=true.
 */
export function assignArtCodes(
  righe: Pick<AIRiga, "isTrasporto">[],
): string[] {
  let hoCounter = 0;

  return righe.map((riga) => {
    if (riga.isTrasporto) {
      return "TR-01";
    }
    hoCounter += 1;
    return `HO-${String(hoCounter).padStart(2, "0")}`;
  });
}
