"use client";

import { useMemo, useState } from "react";
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

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

const TIPO_DOT: Record<string, string> = {
  pvt: "#6366f1",
  public: "#0ea5e9",
};

function toDateKey(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function parseEventDay(dataEvento: string | null): {
  year: number;
  month: number;
  day: number;
  key: string;
} | null {
  if (!dataEvento) return null;
  // Usa la parte data per evitare shift timezone su ISO con orario.
  const datePart = dataEvento.split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m - 1, day: d, key: datePart };
}

/** Indice colonna Lun=0 … Dom=6 a partire da Date#getDay() (Dom=0). */
function mondayBasedIndex(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

export default function MomentumCalendar({
  eventi,
  year,
  domain,
}: {
  eventi: CalendarEvento[];
  year: number;
  domain: string;
}) {
  const today = new Date();
  const todayKey = toDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(
    today.getFullYear() === year ? todayKey : null
  );

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvento[]>();
    for (const e of eventi) {
      const parsed = parseEventDay(e.data_evento);
      if (!parsed || parsed.year !== year) continue;
      const list = map.get(parsed.key) ?? [];
      list.push(e);
      map.set(parsed.key, list);
    }
    return map;
  }, [eventi, year]);

  const selectedEvents = selectedKey ? byDay.get(selectedKey) ?? [] : [];

  const currentMonth = today.getFullYear() === year ? today.getMonth() : -1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MONTH_NAMES.map((name, monthIndex) => {
          const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
          const firstWeekday = mondayBasedIndex(
            new Date(year, monthIndex, 1).getDay()
          );
          const cells: Array<{ day: number | null; key: string | null }> = [];
          for (let i = 0; i < firstWeekday; i++) {
            cells.push({ day: null, key: null });
          }
          for (let day = 1; day <= daysInMonth; day++) {
            cells.push({ day, key: toDateKey(year, monthIndex, day) });
          }

          const monthEventCount = cells.reduce((acc, cell) => {
            if (!cell.key) return acc;
            return acc + (byDay.get(cell.key)?.length ?? 0);
          }, 0);

          return (
            <div
              key={name}
              className={cn(
                "flex flex-col rounded-xl border bg-card p-3 shadow-sm",
                monthIndex === currentMonth && "ring-2 ring-primary/60"
              )}
            >
              <div className="mb-2 flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-semibold text-foreground">{name}</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {monthEventCount}
                </span>
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {WEEKDAY_LABELS.map((label, idx) => (
                  <div
                    key={label}
                    className={cn(
                      "pb-1 text-center text-[10px] font-medium",
                      idx >= 5
                        ? "text-muted-foreground/80"
                        : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </div>
                ))}

                {cells.map((cell, idx) => {
                  if (cell.day == null || !cell.key) {
                    return <div key={`empty-${idx}`} className="aspect-square" />;
                  }

                  const dayEvents = byDay.get(cell.key) ?? [];
                  const jsDay = new Date(year, monthIndex, cell.day).getDay();
                  const isWeekendDay = jsDay === 0 || jsDay === 6;
                  const isSelected = selectedKey === cell.key;
                  const isToday = cell.key === todayKey;

                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() =>
                        setSelectedKey((prev) =>
                          prev === cell.key ? null : cell.key
                        )
                      }
                      aria-pressed={isSelected}
                      aria-label={`${cell.day} ${name}${
                        dayEvents.length
                          ? `, ${dayEvents.length} eventi`
                          : ""
                      }`}
                      className={cn(
                        "relative flex aspect-square flex-col items-center justify-center rounded-md text-xs transition-colors",
                        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isWeekendDay && !isSelected && "bg-muted/40",
                        isSelected &&
                          "bg-primary text-primary-foreground hover:bg-primary/90",
                        !isSelected && isToday && "ring-1 ring-primary/50",
                        !isSelected && !isToday && "text-foreground"
                      )}
                    >
                      <span className="leading-none">{cell.day}</span>
                      {dayEvents.length > 0 ? (
                        <span className="mt-0.5 flex max-w-full items-center justify-center gap-0.5">
                          {dayEvents.slice(0, 3).map((e) => (
                            <span
                              key={e.id}
                              className={cn(
                                "h-1 w-1 shrink-0 rounded-full",
                                isSelected && "bg-primary-foreground"
                              )}
                              style={
                                isSelected
                                  ? undefined
                                  : {
                                      backgroundColor:
                                        TIPO_DOT[e.tipo_evento] || "#64748b",
                                    }
                              }
                            />
                          ))}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          {selectedKey
            ? `Eventi del ${selectedKey.split("-").reverse().join(".")}`
            : "Seleziona un giorno (inclusi sabato e domenica)"}
        </h2>
        {!selectedKey ? (
          <p className="text-sm text-muted-foreground">
            Clicca un giorno nel calendario per vedere gli eventi.
          </p>
        ) : selectedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessun evento in questo giorno.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {selectedEvents.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/sites/${domain}/momentum/eventi/${e.id}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: TIPO_DOT[e.tipo_evento] || "#64748b",
                    }}
                  />
                  <span className="text-foreground">{e.titolo}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
