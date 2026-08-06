"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/layout/empty-state";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import EventoFormDialog from "./EventoFormDialog";
import {
  EVENTO_STATI,
  EVENTO_STATO_LABELS,
  EVENTO_TIPI,
  EVENTO_TIPO_LABELS,
  type CampagnaEvento,
  type EventoTipo,
} from "@/lib/campagna/config";

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

// Legale -> rosso, pubblicazione -> verde, tutti gli altri -> blu.
function tipoBadgeClasses(tipo: EventoTipo): string {
  if (tipo === "scadenza_legale")
    return "bg-destructive text-destructive-foreground";
  if (tipo === "pubblicazione") return "bg-success text-background";
  return "bg-info text-background";
}

// Colore pallino calendario derivato dal dato (inline style, come da UI rules).
function tipoDotColor(tipo: EventoTipo): string {
  if (tipo === "scadenza_legale") return "hsl(var(--destructive))";
  if (tipo === "pubblicazione") return "hsl(var(--success))";
  return "hsl(var(--info))";
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-CH", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function eventDateKey(iso: string): string | null {
  if (!iso) return null;
  const datePart = iso.split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function mondayBasedIndex(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function EventoRow({
  evento,
  domain,
}: {
  evento: CampagnaEvento;
  domain: string;
}) {
  const isLegale = evento.tipo === "scadenza_legale";
  return (
    <EventoFormDialog
      domain={domain}
      evento={evento}
      trigger={
        <button type="button" className="w-full text-left focus:outline-none">
          <Card
            className={cn(
              "transition-colors hover:bg-surface",
              isLegale && "border-destructive/60",
            )}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex flex-col items-center justify-center rounded-lg bg-muted px-3 py-2 text-center">
                {isLegale ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : (
                  <CalendarDays className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{evento.titolo}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[11px] font-medium",
                      tipoBadgeClasses(evento.tipo),
                    )}
                  >
                    {EVENTO_TIPO_LABELS[evento.tipo]}
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {EVENTO_STATO_LABELS[evento.stato]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(evento.data_inizio)}
                  {evento.luogo ? ` · ${evento.luogo}` : ""}
                  {evento.comune ? ` (${evento.comune})` : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        </button>
      }
    />
  );
}

function MonthCalendar({
  eventi,
  domain,
}: {
  eventi: CampagnaEvento[];
  domain: string;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const todayKey = eventDateKey(today.toISOString());
  const [selectedKey, setSelectedKey] = useState<string | null>(todayKey);

  const byDay = useMemo(() => {
    const map = new Map<string, CampagnaEvento[]>();
    for (const e of eventi) {
      const key = eventDateKey(e.data_inizio);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [eventi]);

  const { year, month } = cursor;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = mondayBasedIndex(new Date(year, month, 1).getDay());

  const cells: Array<{ day: number | null; key: string | null }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, key: null });
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;
    cells.push({ day, key });
  }

  const goPrev = () =>
    setCursor((c) =>
      c.month === 0
        ? { year: c.year - 1, month: 11 }
        : { year: c.year, month: c.month - 1 },
    );
  const goNext = () =>
    setCursor((c) =>
      c.month === 11
        ? { year: c.year + 1, month: 0 }
        : { year: c.year, month: c.month + 1 },
    );

  const selectedEvents = selectedKey ? byDay.get(selectedKey) ?? [] : [];
  const monthEventCount = cells.reduce(
    (acc, cell) => acc + (cell.key ? byDay.get(cell.key)?.length ?? 0 : 0),
    0,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">
              {MONTH_NAMES[month]} {year}
            </h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {monthEventCount} eventi
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={goPrev} aria-label="Mese precedente">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCursor({
                  year: today.getFullYear(),
                  month: today.getMonth(),
                })
              }
            >
              Oggi
            </Button>
            <Button variant="ghost" size="icon" onClick={goNext} aria-label="Mese successivo">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label, idx) => (
            <div
              key={label}
              className={cn(
                "pb-1 text-center text-xs font-medium",
                idx >= 5 ? "text-muted-foreground/80" : "text-muted-foreground",
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
            const jsDay = new Date(year, month, cell.day).getDay();
            const isWeekend = jsDay === 0 || jsDay === 6;
            const isSelected = selectedKey === cell.key;
            const isToday = cell.key === todayKey;
            const hasLegale = dayEvents.some(
              (e) => e.tipo === "scadenza_legale",
            );

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() =>
                  setSelectedKey((prev) => (prev === cell.key ? null : cell.key))
                }
                aria-pressed={isSelected}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-start gap-1 rounded-md p-1 text-sm transition-colors",
                  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isWeekend && !isSelected && "bg-muted/40",
                  isSelected &&
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                  !isSelected && isToday && "ring-1 ring-primary/50",
                  hasLegale && !isSelected && "ring-1 ring-destructive/60",
                )}
              >
                <span className="leading-none">{cell.day}</span>
                {dayEvents.length > 0 && (
                  <span className="flex flex-wrap items-center justify-center gap-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={
                          isSelected
                            ? { backgroundColor: "hsl(var(--primary-foreground))" }
                            : { backgroundColor: tipoDotColor(e.tipo) }
                        }
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] leading-none">
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">
          {selectedKey
            ? `Eventi del ${selectedKey.split("-").reverse().join(".")}`
            : "Seleziona un giorno"}
        </h3>
        {!selectedKey ? (
          <p className="text-sm text-muted-foreground">
            Clicca un giorno per vedere gli eventi pianificati.
          </p>
        ) : selectedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessun evento in questo giorno.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map((e) => (
              <EventoRow key={e.id} evento={e} domain={domain} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalendarioClient({
  eventi,
  domain,
}: {
  eventi: CampagnaEvento[];
  domain: string;
}) {
  const [view, setView] = useState<"calendario" | "agenda">("calendario");
  const [tipo, setTipo] = useState("all");
  const [stato, setStato] = useState("all");

  // Legal deadlines are ALWAYS surfaced at the top, regardless of filters.
  const scadenzeLegali = useMemo(
    () => eventi.filter((e) => e.tipo === "scadenza_legale"),
    [eventi],
  );

  const agendaEventi = useMemo(() => {
    return eventi.filter((e) => {
      if (e.tipo === "scadenza_legale") return false;
      if (tipo !== "all" && e.tipo !== tipo) return false;
      if (stato !== "all" && e.stato !== stato) return false;
      return true;
    });
  }, [eventi, tipo, stato]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
          <button
            type="button"
            onClick={() => setView("calendario")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "calendario"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Calendario
          </button>
          <button
            type="button"
            onClick={() => setView("agenda")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "agenda"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Agenda
          </button>
        </div>

        {view === "agenda" && (
          <>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Ogni tipo</SelectItem>
                {EVENTO_TIPI.filter((t) => t !== "scadenza_legale").map((t) => (
                  <SelectItem key={t} value={t}>
                    {EVENTO_TIPO_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stato} onValueChange={setStato}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Ogni stato</SelectItem>
                {EVENTO_STATI.map((s) => (
                  <SelectItem key={s} value={s}>
                    {EVENTO_STATO_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {scadenzeLegali.length > 0 && (
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Scadenze legali
          </h2>
          <div className="space-y-2">
            {scadenzeLegali.map((e) => (
              <EventoRow key={e.id} evento={e} domain={domain} />
            ))}
          </div>
        </div>
      )}

      {view === "calendario" ? (
        eventi.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" />}
            title="Nessun evento"
            description="Crea un evento con il pulsante 'Nuovo evento'."
          />
        ) : (
          <MonthCalendar eventi={eventi} domain={domain} />
        )
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Eventi</h2>
          {agendaEventi.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="Nessun evento"
              description="Crea un evento o modifica i filtri."
            />
          ) : (
            <div className="space-y-2">
              {agendaEventi.map((e) => (
                <EventoRow key={e.id} evento={e} domain={domain} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
