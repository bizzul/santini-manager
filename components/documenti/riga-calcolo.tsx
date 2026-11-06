"use client";

import type { CalcoloRiga } from "@/validation/documenti/extracted-document";

/**
 * Avvisi e catena di calcolo di una posizione d'offerta.
 *
 * Legge il blocco congelato sulla riga al momento del calcolo: non ricalcola
 * nulla, cosi' un documento riaperto mostra sempre il prezzo che il cliente
 * ha ricevuto, anche dopo un aggiornamento di listino.
 */

const CHF = (n: number) => n.toFixed(2);

const STILE_AVVISO: Record<string, string> = {
  alta: "border-destructive/40 bg-destructive/10 text-destructive",
  media: "border-warning/40 bg-warning/10 text-warning",
  bassa: "border-border bg-muted/20 text-muted-foreground",
};

const ETICHETTA_AVVISO: Record<string, string> = {
  alta: "Da quotare",
  media: "Verifica",
  bassa: "Nota",
};

interface BreakdownLetto {
  prezzoBase?: number;
  incrementiDimensionali?: { dimensione: string; valoreMm: number; importo: number }[];
  coefficienti?: { categoria: string; codice: string; moltiplicatore: number }[];
  supplementiFissi?: { codice: string; nome: string; importo: number }[];
  supplementiPercentuali?: { codice: string; nome: string; valore: number }[];
  prezzoUnitario?: number;
  quantita?: number;
  totale?: number;
}

export function RigaCalcolo({ calcolo }: { calcolo?: CalcoloRiga | null }) {
  if (!calcolo) return null;

  const breakdown = (calcolo.breakdown ?? null) as BreakdownLetto | null;
  const avvisi = calcolo.avvisi ?? [];

  return (
    <div className="space-y-1.5">
      {calcolo.stato === "da_quotare" ? (
        <p className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive">
          Posizione non quotata dal motore: prezzo a zero finche&apos; non viene
          inserito a mano.
        </p>
      ) : null}

      {avvisi.map((a, i) => (
        <p
          key={`${a.codice}-${i}`}
          className={`flex gap-1.5 rounded border px-2 py-1 text-[11px] ${
            STILE_AVVISO[a.severita] ?? STILE_AVVISO.bassa
          }`}
        >
          <span className="shrink-0 font-semibold uppercase">
            {ETICHETTA_AVVISO[a.severita] ?? "Nota"}
          </span>
          <span>{a.messaggio}</span>
        </p>
      ))}

      {breakdown ? (
        <details className="rounded border bg-muted/10 px-2 py-1">
          <summary className="cursor-pointer text-[11px] text-muted-foreground">
            Come e&apos; stato calcolato
          </summary>
          <div className="mt-1 space-y-0.5 font-mono text-[11px]">
            {breakdown.prezzoBase != null ? (
              <Voce etichetta="Prezzo base" valore={CHF(breakdown.prezzoBase)} />
            ) : null}
            {(breakdown.incrementiDimensionali ?? []).map((i) => (
              <Voce
                key={`inc-${i.dimensione}`}
                etichetta={`+ Extra ${i.dimensione} (${i.valoreMm} mm)`}
                valore={CHF(i.importo)}
              />
            ))}
            {(breakdown.coefficienti ?? []).map((c) => (
              <Voce
                key={`co-${c.categoria}-${c.codice}`}
                etichetta={`x ${c.categoria} ${c.codice}`}
                valore={Number(c.moltiplicatore).toFixed(2)}
              />
            ))}
            {(breakdown.supplementiFissi ?? []).map((s) => (
              <Voce
                key={`sf-${s.codice}`}
                etichetta={`+ ${s.nome}`}
                valore={CHF(s.importo)}
              />
            ))}
            {(breakdown.supplementiPercentuali ?? []).map((s) => (
              <Voce
                key={`sp-${s.codice}`}
                etichetta={`+ ${s.nome}`}
                valore={`${s.valore}%`}
              />
            ))}
            {breakdown.totale != null ? (
              <div className="mt-1 border-t pt-1">
                <Voce
                  etichetta={`x Quantita ${breakdown.quantita ?? 1}`}
                  valore={CHF(breakdown.totale)}
                  forte
                />
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function Voce({
  etichetta,
  valore,
  forte,
}: {
  etichetta: string;
  valore: string;
  forte?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-3 ${
        forte ? "font-semibold" : "text-muted-foreground"
      }`}
    >
      <span>{etichetta}</span>
      <span>{valore}</span>
    </div>
  );
}

/** Conteggi per la barra in testa alla schermata di verifica. */
export function riepilogaCalcoli(
  righe: { calcolo?: CalcoloRiga | null }[],
): { alta: number; media: number; bassa: number; bloccanti: number } {
  let alta = 0;
  let media = 0;
  let bassa = 0;
  let bloccanti = 0;
  for (const riga of righe) {
    if (!riga.calcolo) continue;
    if (riga.calcolo.stato === "da_quotare") bloccanti += 1;
    for (const a of riga.calcolo.avvisi ?? []) {
      if (a.severita === "alta") alta += 1;
      else if (a.severita === "media") media += 1;
      else bassa += 1;
    }
  }
  return { alta, media, bassa, bloccanti };
}
