import type { RigaArricchita } from "@/validation/documenti/extracted-document";
import type { ModalitaPrezzo } from "@/types/supabase";

export interface BuildCatalogRigaParams {
  productId: number;
  productName: string;
  imageUrl?: string | null;
  modalita: ModalitaPrezzo | null;
  larghezzaMm?: number | null;
  altezzaMm?: number | null;
  profonditaMm?: number | null;
  codMateriale?: string | null;
  codVetroTelaio?: string | null;
  /** Nomi dei supplementi selezionati (per la descrizione estesa). */
  supplementiNomi?: string[];
  quantita: number;
  prezzoUnitario: number;
}

function modalitaRichiedeMisure(modalita: ModalitaPrezzo | null): boolean {
  return (
    modalita === "griglia" ||
    modalita === "misure_standard" ||
    modalita === "mq" ||
    modalita === "mc"
  );
}

/**
 * Dimensioni grezze SENZA prefisso "Misure:" (convenzione del campo `misure`:
 * il template PDF antepone lui l'etichetta). Ritorna es. "800x1400 mm".
 */
export function buildMisureLabel(
  modalita: ModalitaPrezzo | null,
  larghezzaMm?: number | null,
  altezzaMm?: number | null,
  profonditaMm?: number | null,
): string | null {
  if (!modalitaRichiedeMisure(modalita)) return null;
  const w = Number(larghezzaMm);
  const h = Number(altezzaMm);
  if (!(w > 0 && h > 0)) return null;
  const d = Number(profonditaMm);
  const dims = modalita === "mc" && d > 0 ? `${w}x${h}x${d}` : `${w}x${h}`;
  return `${dims} mm`;
}

/**
 * Descrizione estesa multi-riga. Include anche le misure (con etichetta) cosi'
 * restano visibili nel PDF anche quando sono presenti materiale/supplementi
 * (il template mostra la descrizioneEstesa in luogo del campo `misure`).
 */
export function buildDescrizioneEstesa(
  misureLabel?: string | null,
  codMateriale?: string | null,
  codVetroTelaio?: string | null,
  supplementiNomi?: string[],
): string | null {
  const parts: string[] = [];
  if (misureLabel) parts.push(`Misure: ${misureLabel}`);
  if (codMateriale) parts.push(`Materiale: ${codMateriale}`);
  if (codVetroTelaio) parts.push(`Vetro/telaio: ${codVetroTelaio}`);
  if (supplementiNomi && supplementiNomi.length > 0) {
    parts.push(`Supplementi: ${supplementiNomi.join(", ")}`);
  }
  return parts.length > 0 ? parts.join(" \u00b7 ") : null;
}

/**
 * Costruisce una RigaArricchita a partire dalla configurazione di catalogo,
 * nello stesso formato delle righe manuali cosi' da entrare invariata nella
 * pipeline righe_documento / PDF esistente.
 */
export function buildCatalogRiga(
  params: BuildCatalogRigaParams,
): RigaArricchita {
  const prezzo = Number(params.prezzoUnitario);
  const quantita = Number(params.quantita) || 1;
  const misureLabel = buildMisureLabel(
    params.modalita,
    params.larghezzaMm,
    params.altezzaMm,
    params.profonditaMm,
  );

  return {
    descrizione: params.productName,
    descrizioneEstesa: buildDescrizioneEstesa(
      misureLabel,
      params.codMateriale,
      params.codVetroTelaio,
      params.supplementiNomi,
    ),
    misure: misureLabel,
    unita: "Pz.",
    quantita,
    prezzoUnitario: Number.isFinite(prezzo) ? prezzo : 0,
    sconto: null,
    isTrasporto: false,
    articoloId: params.productId,
    articoloSource: "sell_product",
    isNuovo: false,
    immagineUrl: params.imageUrl ?? null,
  };
}
