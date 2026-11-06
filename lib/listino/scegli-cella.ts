// ---------------------------------------------------------------------------
// Scelta della cella di griglia quando piu' fasce contengono la stessa misura.
//
// Le fasce dovrebbero essere chiuse e disgiunte (400-600, 601-800, ...), ma un
// errore di caricamento puo' produrre sovrapposizioni. In quel caso serve una
// regola esplicita, altrimenti il prezzo dipende dall'ordine con cui il
// database restituisce le righe: lo stesso serramento costa cifre diverse a
// seconda del momento.
//
// Regola: vince la fascia piu' STRETTA, cioe' la piu' specifica. A parita' di
// ampiezza vince la piu' cara, che e' il verso giusto in cui sbagliare su un
// documento commerciale.
// ---------------------------------------------------------------------------

export interface CellaGriglia {
  larghezza_min_mm: number;
  larghezza_max_mm: number;
  altezza_min_mm: number;
  altezza_max_mm: number;
  prezzo_base_chf: number | string;
}

function contiene(
  cella: CellaGriglia,
  larghezzaMm: number,
  altezzaMm: number,
): boolean {
  return (
    larghezzaMm >= cella.larghezza_min_mm &&
    larghezzaMm <= cella.larghezza_max_mm &&
    altezzaMm >= cella.altezza_min_mm &&
    altezzaMm <= cella.altezza_max_mm
  );
}

function ampiezza(cella: CellaGriglia): number {
  return (
    cella.larghezza_max_mm -
    cella.larghezza_min_mm +
    (cella.altezza_max_mm - cella.altezza_min_mm)
  );
}

export function scegliCellaPiuSpecifica(
  celle: CellaGriglia[],
  larghezzaMm: number,
  altezzaMm: number,
): CellaGriglia | null {
  const candidate = celle.filter((c) => contiene(c, larghezzaMm, altezzaMm));
  if (candidate.length === 0) return null;
  if (candidate.length === 1) return candidate[0];

  return candidate.reduce((migliore, corrente) => {
    const dA = ampiezza(corrente) - ampiezza(migliore);
    if (dA !== 0) return dA < 0 ? corrente : migliore;
    return Number(corrente.prezzo_base_chf) > Number(migliore.prezzo_base_chf)
      ? corrente
      : migliore;
  });
}
