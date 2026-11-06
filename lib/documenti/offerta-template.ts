import type { RigaArricchita } from "@/validation/documenti/extracted-document";

/**
 * Template di righe base per categoria, condivisi fra la scelta categorie
 * del passo 1 e il dialogo "Da categoria" del passo 2.
 */

export interface TemplateRiga {
  id: string;
  sellProductId: number | null;
  descrizione: string;
  testoBase: string | null;
  unita: string;
  quantitaDefault: number;
  richiedeMisure: boolean;
}

export interface OffertaTemplate {
  id: string;
  categoria: string;
  nome: string;
  descrizione: string | null;
  righe: TemplateRiga[];
}

export async function fetchOffertaTemplates(
  domain: string,
): Promise<OffertaTemplate[]> {
  const res = await fetch("/api/listino/offerta-template", {
    headers: { "x-site-domain": domain },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Impossibile caricare i template.");
  }
  return (data.templates ?? []) as OffertaTemplate[];
}

/**
 * Le posizioni da template entrano SENZA prezzo e marcate da quotare: una
 * riga di template non e' quotabile finche' non ha le misure, e deve vedersi.
 */
export function templateToRighe(t: OffertaTemplate): RigaArricchita[] {
  return t.righe.map((r) => ({
    descrizione: r.descrizione,
    descrizioneEstesa: r.testoBase,
    misure: null,
    unita: r.unita as RigaArricchita["unita"],
    quantita: r.quantitaDefault,
    prezzoUnitario: 0,
    sconto: null,
    isTrasporto: false,
    articoloId: r.sellProductId,
    articoloSource: r.sellProductId
      ? ("sell_product" as const)
      : ("none" as const),
    isNuovo: !r.sellProductId,
    configurazione: r.sellProductId ? { sellProductId: r.sellProductId } : null,
    calcolo: {
      stato: "da_quotare" as const,
      prezzoUnitario: 0,
      codiceErrore: null,
      avvisi: [
        {
          codice: "PREZZO_NON_DISPONIBILE",
          severita: "alta" as const,
          messaggio: r.richiedeMisure
            ? "Posizione da template: inserire le misure e calcolare il prezzo."
            : "Posizione da template: inserire il prezzo.",
        },
      ],
      breakdown: null,
      calcolatoIl: null,
    },
  }));
}
