import type { DestinatarioInput } from "@/validation/documenti/extracted-document";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";

/**
 * Impone i dati destinatario scelti nel form sul documento generato dall'AI.
 * L'AI può estrarre un altro nome dal testo descrittivo: il form ha priorità.
 */
export function applyFormDestinatarioToDocumento(
  documento: DocumentoArricchito,
  input: DestinatarioInput,
): DocumentoArricchito {
  documento.destinatario.ragioneSociale = input.ragioneSociale.trim();
  documento.destinatario.aca = input.aca?.trim() || null;
  documento.destinatario.via = input.via?.trim() || null;
  documento.destinatario.cap = input.cap?.trim() || null;
  documento.destinatario.citta = input.citta?.trim() || null;
  documento.destinatario.email = input.email?.trim() || null;

  if (input.entityId && input.tipo === "cliente") {
    documento.destinatario.clienteId = input.entityId;
    documento.destinatario.fornitoreId = null;
    documento.destinatario.isNuovo = false;
  } else if (input.entityId && input.tipo === "fornitore") {
    documento.destinatario.fornitoreId = input.entityId;
    documento.destinatario.clienteId = null;
    documento.destinatario.isNuovo = false;
  } else {
    documento.destinatario.clienteId = null;
    documento.destinatario.fornitoreId = null;
    documento.destinatario.isNuovo = input.tipo === "manuale";
  }

  return documento;
}
