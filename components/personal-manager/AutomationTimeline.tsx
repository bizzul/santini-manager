import { CircleDashed, CircleDot, CheckCircle2 } from "lucide-react";
import {
  AUTOMATION_STATO_LABELS,
  getAreaDef,
  type AutomationStato,
  type PmAutomation,
} from "@/lib/personal-manager/types";

const STATO_ICON: Record<AutomationStato, typeof CircleDashed> = {
  previsto: CircleDashed,
  in_integrazione: CircleDot,
  attivo: CheckCircle2,
};

const STATO_TONE: Record<AutomationStato, string> = {
  previsto: "text-muted-foreground",
  in_integrazione: "text-info",
  attivo: "text-success",
};

/** Timeline verticale delle automazioni (previsto -> in_integrazione -> attivo). */
export function AutomationTimeline({
  automations,
}: {
  automations: PmAutomation[];
}) {
  return (
    <ol className="relative space-y-4 border-l border-border pl-6">
      {automations.map((automation) => {
        const Icon = STATO_ICON[automation.stato];
        const tone = STATO_TONE[automation.stato];
        const area = automation.area_slug
          ? getAreaDef(automation.area_slug)
          : undefined;
        const dateLabel =
          automation.stato === "attivo" && automation.data_attivazione
            ? `Attiva dal ${new Date(automation.data_attivazione).toLocaleDateString("it-IT")}`
            : automation.data_prevista
              ? `Prevista ${new Date(automation.data_prevista).toLocaleDateString("it-IT")}`
              : "Data da definire";

        return (
          <li key={automation.id} className="relative">
            <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card">
              <Icon className={`h-4 w-4 ${tone}`} />
            </span>
            <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {automation.name}
                </p>
                <span className={`shrink-0 text-[11px] font-semibold ${tone}`}>
                  {AUTOMATION_STATO_LABELS[automation.stato]}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                {area ? (
                  <span
                    className="inline-flex items-center gap-1 font-medium"
                    style={{ color: area.accent }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: area.accent }}
                    />
                    {area.label}
                  </span>
                ) : (
                  <span>Trasversale</span>
                )}
                <span>{dateLabel}</span>
                {automation.source_ref ? (
                  <span className="rounded bg-muted px-1.5 py-0.5">
                    {automation.source_ref}
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
