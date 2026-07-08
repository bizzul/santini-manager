import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CalendarEvento } from "@/lib/momentum-data";

const MONTH_NAMES = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];

const TIPO_DOT: Record<string, string> = {
  pvt: "#6366f1",
  public: "#0ea5e9",
};

export default function MomentumCalendar({
  eventi,
  year,
  domain,
}: {
  eventi: CalendarEvento[];
  year: number;
  domain: string;
}) {
  // Raggruppa per mese (0-11).
  const byMonth: CalendarEvento[][] = Array.from({ length: 12 }, () => []);
  for (const e of eventi) {
    if (!e.data_evento) continue;
    const m = new Date(e.data_evento).getMonth();
    byMonth[m].push(e);
  }

  const today = new Date();
  const currentMonth =
    today.getFullYear() === year ? today.getMonth() : -1;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {MONTH_NAMES.map((name, idx) => {
        const list = byMonth[idx];
        return (
          <div
            key={name}
            className={cn(
              "flex flex-col rounded-xl border bg-card p-3 shadow-sm",
              idx === currentMonth && "ring-2 ring-primary/60"
            )}
          >
            <div className="mb-2 flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold text-foreground">
                {name}
              </h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {list.length}
              </span>
            </div>
            {list.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">
                Nessun evento
              </p>
            ) : (
              <ul className="space-y-1.5">
                {list.map((e) => {
                  const day = e.data_evento
                    ? new Date(e.data_evento).getDate()
                    : null;
                  return (
                    <li key={e.id}>
                      <Link
                        href={`/sites/${domain}/momentum/eventi/${e.id}`}
                        className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-muted"
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: TIPO_DOT[e.tipo_evento] || "#64748b",
                          }}
                        />
                        {day != null ? (
                          <span className="w-5 shrink-0 font-medium text-muted-foreground">
                            {day}
                          </span>
                        ) : null}
                        <span className="line-clamp-1 text-foreground">
                          {e.titolo}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
