import { FolderKanban, Building2, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttivitaBoardRow } from "@/types/overview-connector";

const CHIP_COLORS = {
  progetti: "#7C3AED",
  aziende: "#2563EB",
  persone: "#059669",
} as const;

function Chip({
  icon: Icon,
  label,
  color,
}: {
  icon: typeof FolderKanban;
  label: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ color, borderColor: color }}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function BoardCard({
  card,
  soglia,
  dragging = false,
  className,
}: {
  card: AttivitaBoardRow;
  soglia: number;
  dragging?: boolean;
  className?: string;
}) {
  const stagnante = card.giorni_fermo > soglia;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-xs",
        stagnante && "border-l-4 border-l-destructive",
        dragging && "opacity-60",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-mono text-[11px] text-muted-foreground">
            {card.codice}
          </span>
          <p className="truncate text-sm font-bold text-foreground">{card.titolo}</p>
        </div>
        {stagnante && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground">
            <Clock className="h-3 w-3" />
            {card.giorni_fermo}gg
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span
          className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-foreground"
          style={{ backgroundColor: `${card.ambito_colore}33` }}
        >
          {card.ambito_nome}
        </span>
        {card.sotto_stato && (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {card.sotto_stato}
          </span>
        )}
      </div>

      {(card.progetti.length > 0 ||
        card.aziende.length > 0 ||
        card.persone.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {card.progetti.map((nome) => (
            <Chip
              key={`p-${nome}`}
              icon={FolderKanban}
              label={nome}
              color={CHIP_COLORS.progetti}
            />
          ))}
          {card.aziende.map((nome) => (
            <Chip
              key={`a-${nome}`}
              icon={Building2}
              label={nome}
              color={CHIP_COLORS.aziende}
            />
          ))}
          {card.persone.map((nome) => (
            <Chip
              key={`u-${nome}`}
              icon={User}
              label={nome}
              color={CHIP_COLORS.persone}
            />
          ))}
        </div>
      )}
    </div>
  );
}
