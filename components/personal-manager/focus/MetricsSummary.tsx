import type { FocusAreaTile } from "@/lib/personal-manager/voice-types";

type Props = {
  areas: FocusAreaTile[];
  loading?: boolean;
};

/** Griglia 2×2: prime 4 aree_vita per ordine, con punteggio. */
export function MetricsSummary({ areas, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  if (areas.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
        Nessuna area ancora. Completa l&apos;abilitazione del Manager Personale.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {areas.map((a) => (
        <article
          key={a.id}
          className="rounded-2xl border border-border bg-card p-3.5 shadow-sm"
        >
          <div className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: a.colore }}
            />
            {a.nome}
          </div>
          <div className="mt-1 text-xl font-bold text-foreground">
            {a.punteggio != null ? a.punteggio.toFixed(1) : "—"}
            <span className="ml-1 text-sm font-semibold text-muted-foreground">
              /10
            </span>
          </div>
          <div className="mt-0.5 text-xs font-medium text-muted-foreground">
            Punteggio
          </div>
        </article>
      ))}
    </div>
  );
}
