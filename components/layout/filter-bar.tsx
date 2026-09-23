import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface FilterBarProps {
  /** Campo di ricerca principale (uno solo per pagina). */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Filtri (select, chip, toggle) allineati dopo la ricerca. */
  filters?: React.ReactNode;
  /** Azioni secondarie a destra (vista tabella/riquadri, esporta). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * FilterBar - ricerca, filtri e azioni in un'unica barra, uguale in tutti
 * i moduli. Sostituisce le combinazioni ad hoc (doppia ricerca, pulsante
 * "Indietro" nella toolbar, filtri sparsi).
 */
export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Cerca…",
  filters,
  actions,
  className,
}: FilterBarProps) {
  const hasSearch = onSearchChange !== undefined;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-card border bg-card p-2 shadow-card",
        className
      )}
    >
      {hasSearch ? (
        <div className="relative min-w-[220px] flex-1 md:max-w-sm">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={searchValue ?? ""}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 pl-8"
          />
        </div>
      ) : null}
      {filters ? (
        <div className="flex flex-wrap items-center gap-2">{filters}</div>
      ) : null}
      {actions ? (
        <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
