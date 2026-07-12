import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Activity, Gauge, Clock } from "lucide-react";
import type { OverviewKpi } from "@/types/overview-connector";

export function KpiStrip({ kpi }: { kpi: OverviewKpi }) {
  const stagnantiAllarme = kpi.stagnanti > 0;
  const wipStop = kpi.saturazioneWipDoingPct > 100;
  const saturazioneClamp = Math.min(kpi.saturazioneWipDoingPct, 100);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Attive */}
      <Card className="flex flex-col gap-1 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" />
          Attive
        </div>
        <div className="text-3xl font-bold text-foreground">{kpi.attive}</div>
        <div className="text-xs text-muted-foreground">todo + doing</div>
      </Card>

      {/* Card stagnanti */}
      <Card
        className={cn(
          "flex flex-col gap-1 p-4",
          stagnantiAllarme && "border-destructive bg-destructive/10",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 text-sm text-muted-foreground",
            stagnantiAllarme && "text-destructive",
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          Card stagnanti
        </div>
        <div
          className={cn(
            "text-3xl font-bold text-foreground",
            stagnantiAllarme && "text-destructive",
          )}
        >
          {kpi.stagnanti}
        </div>
        <div className="text-xs text-muted-foreground">oltre la soglia</div>
      </Card>

      {/* Saturazione WIP Doing */}
      <Card
        className={cn(
          "flex flex-col gap-2 p-4",
          wipStop && "border-destructive bg-destructive text-destructive-foreground",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 text-sm text-muted-foreground",
            wipStop && "text-destructive-foreground",
          )}
        >
          <Gauge className="h-4 w-4" />
          Saturazione WIP Doing
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-3xl font-bold text-foreground",
              wipStop && "text-destructive-foreground",
            )}
          >
            {kpi.saturazioneWipDoingPct}%
          </span>
          <span
            className={cn(
              "text-xs text-muted-foreground",
              wipStop && "text-destructive-foreground/80",
            )}
          >
            {kpi.doingCount}/{kpi.doingLimite}
          </span>
        </div>
        <div
          className={cn(
            "h-2 w-full overflow-hidden rounded-full",
            wipStop ? "bg-destructive-foreground/25" : "bg-muted",
          )}
        >
          <div
            className={cn("h-full rounded-full", wipStop ? "bg-destructive-foreground" : "bg-success")}
            style={{ width: `${saturazioneClamp}%` }}
          />
        </div>
        {wipStop && (
          <div className="mt-1 text-sm font-bold uppercase tracking-wide">
            STOP — non aggiungere lavoro
          </div>
        )}
      </Card>

      {/* Giorni fermo max */}
      <Card className="flex flex-col gap-1 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Giorni fermo max
        </div>
        <div className="text-3xl font-bold text-foreground">
          {kpi.giorniFermoMax}
          <span className="ml-1 text-base font-medium text-muted-foreground">gg</span>
        </div>
        <div className="text-xs text-muted-foreground">card attiva piu' ferma</div>
      </Card>
    </div>
  );
}
