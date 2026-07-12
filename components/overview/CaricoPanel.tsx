import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CaricoRow, OverviewFilters } from "@/types/overview-connector";
import { buildOverviewHref } from "./href";

export function CaricoPanel({
  domain,
  filters,
  titolo,
  colonna,
  rows,
  filterKey,
  highlightNome,
}: {
  domain: string;
  filters: OverviewFilters;
  titolo: string;
  colonna: string;
  rows: CaricoRow[];
  filterKey: "azienda" | "persona";
  highlightNome?: string;
}) {
  const activeNome = filterKey === "azienda" ? filters.azienda : filters.persona;

  const rowHref = (nome: string): string => {
    const active = activeNome === nome;
    return buildOverviewHref(domain, filters, {
      [filterKey]: active ? null : nome,
    });
  };

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{titolo}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">{colonna}</th>
              <th className="px-2 py-2 text-right font-medium">ToDo</th>
              <th className="px-2 py-2 text-right font-medium">Doing</th>
              <th className="px-4 py-2 text-right font-medium">Attive</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  Nessun carico attivo.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const active = activeNome === row.nome;
                const highlight = highlightNome && row.nome === highlightNome;
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border/60 transition-colors last:border-0",
                      active ? "bg-primary/10" : "hover:bg-page-soft",
                    )}
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={rowHref(row.nome)}
                        className={cn(
                          "font-medium text-foreground hover:underline",
                          active && "text-primary",
                        )}
                      >
                        {row.nome}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                      {row.todo}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                      {row.doing}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2 text-right font-bold tabular-nums text-foreground",
                        highlight && "text-destructive",
                      )}
                    >
                      {row.attive}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
