import Link from "next/link";
import { cn } from "@/lib/utils";
import type { OverviewFilters, SpazioFilter } from "@/types/overview-connector";
import { buildOverviewHref } from "./href";

const SEGMENTS: { value: SpazioFilter; label: string }[] = [
  { value: "tutto", label: "Tutto" },
  { value: "azienda", label: "Azienda" },
  { value: "privato", label: "Privato" },
];

export function OverviewHeader({
  domain,
  filters,
}: {
  domain: string;
  filters: OverviewFilters;
}) {
  const oggi = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Overview Connector
        </h1>
        <p className="text-sm capitalize text-muted-foreground">{oggi}</p>
      </div>

      <nav
        aria-label="Filtro spazio"
        className="inline-flex items-center rounded-lg border border-border bg-card p-1"
      >
        {SEGMENTS.map((seg) => {
          const active = filters.spazio === seg.value;
          return (
            <Link
              key={seg.value}
              href={buildOverviewHref(domain, filters, { spazio: seg.value })}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              {seg.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
