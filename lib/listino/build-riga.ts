import type { RigaArricchita } from "@/validation/documenti/extracted-document";
import type { ModalitaPrezzo } from "@/types/supabase";

export interface BuildCatalogRigaParams {
  productId: number;
  productName: string;
  /**
   * Testo descrittivo base del prodotto a catalogo (SellProduct.description).
   * Viene COPIATO nella riga, non referenziato: se il catalogo cambia, le
   * offerte gia' inviate devono restare come sono state mandate al cliente.
   */
  testoBase?: string | null;
  imageUrl?: string | null;
  modalita: ModalitaPrezzo | null;
  larghezzaMm?: number | null;
  altezzaMm?: number | null;
  profonditaMm?: number | null;
  codMateriale?: string | null;
  codVetroTelaio?: string | null;
  codEsecuzioneAnte?: string | null;
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
  const dims = d > 0 ? `${w}x${h}x${d}` : `${w}x${h}`;
  return `${dims} mm`;
}

export interface DescrizioneEstesaParams {
  /** Testo descrittivo base del prodotto. Va in testa, su riga propria. */
  testoBase?: string | null;
  misureLabel?: string | null;
  codMateriale?: string | null;
  codVetroTelaio?: string | null;
  codEsecuzioneAnte?: string | null;
  supplementiNomi?: string[];
}

/**
 * Descrizione estesa su due livelli, come le offerte Santini reali:
 *
 *   <testo descrittivo base del prodotto>
 *   Misure: 1400x1600 mm · Materiale: PVC · Vetro/telaio: VC3
 *
 * Le misure restano QUI oltre che nel campo `misure`, perche' il template PDF
 * mostra la descrizioneEstesa in luogo del campo misure quando e' presente:
 * toglierle da qui le farebbe sparire dal documento.
 */
export function buildDescrizioneEstesa(
  params: DescrizioneEstesaParams,
): string | null {
  const attributi: string[] = [];
  if (params.misureLabel) attributi.push(`Misure: ${params.misureLabel}`);
  if (params.codMateriale) attributi.push(`Materiale: ${params.codMateriale}`);
  if (params.codVetroTelaio) {
    attributi.push(`Vetro/telaio: ${params.codVetroTelaio}`);
  }
  if (params.codEsecuzioneAnte) {
    attributi.push(`Esecuzione ante: ${params.codEsecuzioneAnte}`);
  }
  if (params.supplementiNomi && params.supplementiNomi.length > 0) {
    attributi.push(`Supplementi: ${params.supplementiNomi.join(", ")}`);
  }

  const testoBase = params.testoBase?.trim() || null;
  const rigaAttributi =
    attributi.length > 0 ? attributi.join(" · ") : null;

  if (testoBase && rigaAttributi) return `${testoBase}\n${rigaAttributi}`;
  return testoBase ?? rigaAttributi;
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
    descrizioneEstesa: buildDescrizioneEstesa({
      testoBase: params.testoBase,
      misureLabel,
      codMateriale: params.codMateriale,
      codVetroTelaio: params.codVetroTelaio,
      codEsecuzioneAnte: params.codEsecuzioneAnte,
      supplementiNomi: params.supplementiNomi,
    }),
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
