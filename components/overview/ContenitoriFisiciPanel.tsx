import { cn } from "@/lib/utils";
import {
  type KanbanCountRow,
  type Semaforo,
  type AttivitaStato,
  STATI,
  STATO_LABEL,
} from "@/types/overview-connector";

const SEMAFORO_STYLE: Record<Semaforo, { dot: string; label: string }> = {
  verde: { dot: "bg-success", label: "text-success" },
  giallo: { dot: "bg-warning", label: "text-warning" },
  rosso: { dot: "bg-destructive", label: "text-destructive" },
};

const SEMAFORO_TESTO: Record<Semaforo, string> = {
  verde: "verde",
  giallo: "giallo",
  rosso: "ROSSO",
};

export function ContenitoriFisiciPanel({
  kanbanCounts,
}: {
  kanbanCounts: KanbanCountRow[];
}) {
  const byStato = new Map<AttivitaStato, KanbanCountRow>(
    kanbanCounts.map((c) => [c.stato, c]),
  );

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Contenitori fisici</h2>
        <p className="text-xs text-muted-foreground">
          Vista di debug del ponte fisico-digitale.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Contenitore</th>
              <th className="px-2 py-2 text-right font-medium">Card dentro</th>
              <th className="px-2 py-2 text-right font-medium">Limite</th>
              <th className="px-2 py-2 text-left font-medium">Semaforo</th>
              <th className="px-4 py-2 text-right font-medium">Card piu' ferma (gg)</th>
            </tr>
          </thead>
          <tbody>
            {STATI.map((stato) => {
              const row = byStato.get(stato);
              const semaforo: Semaforo = row?.semaforo ?? "verde";
              const style = SEMAFORO_STYLE[semaforo];
              return (
                <tr key={stato} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2 font-medium text-foreground">
                    {STATO_LABEL[stato]}
                  </td>
                  <td className="px-2 py-2 text-right font-bold tabular-nums text-foreground">
                    {row?.card_dentro ?? 0}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                    {row?.wip_limite ?? "-"}
                  </td>
                  <td className="px-2 py-2">
                    <span className="inline-flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", style.dot)} />
                      <span className={cn("text-xs font-semibold uppercase", style.label)}>
                        {SEMAFORO_TESTO[semaforo]}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                    {row?.giorni_fermo_max ?? 0}gg
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-4 py-3 text-xs italic text-muted-foreground">
        Questi valori alimentano i display e-paper montati sui contenitori.
      </p>
    </section>
  );
}
