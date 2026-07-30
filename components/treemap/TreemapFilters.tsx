"use client";

import { cn } from "@/lib/utils";
import {
  TM_SALUTE_COLORS,
  TM_SALUTE_LABELS,
  TM_SENSOR_LABELS,
  type TmSensorType,
  type TmStatoSalute,
} from "@/lib/treemap/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const ALL_SALUTE: TmStatoSalute[] = [
  "VERDE",
  "GIALLO",
  "ROSSO",
  "OFFLINE",
  "SCONOSCIUTO",
];

export interface TreemapFilterState {
  salute: TmStatoSalute[];
  tipiSensore: TmSensorType[];
  comune: string | null;
  clientId: number | null;
}

interface TreemapFiltersProps {
  filters: TreemapFilterState;
  onChange: (next: TreemapFilterState) => void;
  comuni: string[];
  clienti: Array<{ id: number; name: string }>;
  counts: Record<TmStatoSalute, number>;
}

export default function TreemapFilters({
  filters,
  onChange,
  comuni,
  clienti,
  counts,
}: TreemapFiltersProps) {
  const toggleSalute = (stato: TmStatoSalute) => {
    const active = filters.salute.includes(stato);
    const next = active
      ? filters.salute.filter((s) => s !== stato)
      : [...filters.salute, stato];
    onChange({ ...filters, salute: next });
  };

  const toggleTipo = (tipo: TmSensorType) => {
    const active = filters.tipiSensore.includes(tipo);
    const next = active
      ? filters.tipiSensore.filter((t) => t !== tipo)
      : [...filters.tipiSensore, tipo];
    onChange({ ...filters, tipiSensore: next });
  };

  const tipiPresenti = Object.keys(TM_SENSOR_LABELS) as TmSensorType[];

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Stato salute
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_SALUTE.map((stato) => {
            const active =
              filters.salute.length === 0 || filters.salute.includes(stato);
            return (
              <button
                key={stato}
                type="button"
                aria-pressed={active}
                onClick={() => toggleSalute(stato)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-opacity",
                  active ? "opacity-100" : "opacity-40",
                )}
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: TM_SALUTE_COLORS[stato] }}
                />
                {TM_SALUTE_LABELS[stato]}
                <span className="text-xs text-muted-foreground">
                  ({counts[stato] ?? 0})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Comune
          </p>
          <Select
            value={filters.comune ?? "all"}
            onValueChange={(v) =>
              onChange({ ...filters, comune: v === "all" ? null : v })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Tutti i comuni" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i comuni</SelectItem>
              {comuni.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cliente
          </p>
          <Select
            value={filters.clientId != null ? String(filters.clientId) : "all"}
            onValueChange={(v) =>
              onChange({
                ...filters,
                clientId: v === "all" ? null : Number(v),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Tutti i clienti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i clienti</SelectItem>
              {clienti.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tipo sensore
        </p>
        <div className="flex flex-wrap gap-1.5">
          {tipiPresenti.map((tipo) => {
            const active =
              filters.tipiSensore.length === 0 ||
              filters.tipiSensore.includes(tipo);
            return (
              <Badge
                key={tipo}
                variant={active ? "default" : "outline"}
                className={cn(
                  "cursor-pointer select-none",
                  !active && "opacity-50",
                )}
                onClick={() => toggleTipo(tipo)}
              >
                {TM_SENSOR_LABELS[tipo]}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}
