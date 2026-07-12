import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  type AmbitoStatoCell,
  type AmbitoStatoRow,
  type AttivitaStato,
  type OverviewFilters,
  STATI,
  STATO_LABEL,
  STATO_COLORE,
} from "@/types/overview-connector";
import { buildOverviewHref } from "./href";

export function AmbitoStatoMatrix({
  domain,
  filters,
  matrix,
  totals,
}: {
  domain: string;
  filters: OverviewFilters;
  matrix: AmbitoStatoRow[];
  totals: AmbitoStatoCell;
}) {
  const cellHref = (ambito: string, stato: AttivitaStato): string => {
    const active = filters.ambito === ambito && filters.stato === stato;
    return active
      ? buildOverviewHref(domain, filters, { ambito: null, stato: null })
      : buildOverviewHref(domain, filters, { ambito, stato });
  };

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Matrice Ambito x Stato</h2>
        <p className="text-xs text-muted-foreground">
          Clicca una cella per filtrare la board sotto.
        </p>
      </div>
      <div className="overflow-x-auto p-2">
        <table className="w-full min-w-[420px] border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                Ambito
              </th>
              {STATI.map((stato) => (
                <th key={stato} className="px-1 py-2">
                  <span
                    className="inline-block w-full rounded-md px-2 py-1 text-center text-xs font-semibold text-foreground"
                    style={{ backgroundColor: STATO_COLORE[stato] }}
                  >
                    {STATO_LABEL[stato]}
                  </span>
                </th>
              ))}
              <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                Totale
              </th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => {
              const rowTotal = row.todo + row.doing + row.finish;
              return (
                <tr key={row.ambito_nome}>
                  <td className="px-3 py-2 font-medium text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: row.ambito_colore }}
                      />
                      {row.ambito_nome}
                    </span>
                  </td>
                  {STATI.map((stato) => {
                    const value = row[stato];
                    const active =
                      filters.ambito === row.ambito_nome && filters.stato === stato;
                    return (
                      <td key={stato} className="p-0.5">
                        <Link
                          href={cellHref(row.ambito_nome, stato)}
                          className={cn(
                            "flex h-10 items-center justify-center rounded-md border text-base font-semibold transition-colors",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-page-soft text-foreground hover:border-primary/60",
                          )}
                        >
                          {value}
                        </Link>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center font-bold text-foreground">
                    {rowTotal}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="px-3 py-2 text-sm font-semibold text-muted-foreground">
                Totale
              </td>
              {STATI.map((stato) => (
                <td
                  key={stato}
                  className="px-1 py-2 text-center text-base font-bold text-foreground"
                >
                  {totals[stato]}
                </td>
              ))}
              <td className="px-3 py-2 text-center text-base font-bold text-foreground">
                {totals.todo + totals.doing + totals.finish}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
