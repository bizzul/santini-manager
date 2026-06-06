import { getNextSequenceValue } from "@/lib/code-generator";

export const DOCUMENT_SEQUENCE_TYPE = "DOCUMENTO";

/**
 * Genera il numero documento nel formato "AA - NNN" (es. "26 - 028").
 * Sequenza unica per site+anno condivisa tra OFFERTA/CONFERMA/FATTURA.
 */
export async function generateDocumentNumber(
  siteId: string,
  year?: number,
): Promise<{ numero: string; anno: number; sequenza: number }> {
  const currentYear = year ?? new Date().getFullYear();
  const sequenza = await getNextSequenceValue(
    siteId,
    DOCUMENT_SEQUENCE_TYPE,
    currentYear,
  );
  const annoCorto = String(currentYear).slice(-2);
  const numero = `${annoCorto} - ${String(sequenza).padStart(3, "0")}`;
  return { numero, anno: currentYear, sequenza };
}
