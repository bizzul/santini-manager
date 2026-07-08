"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CalendarDays, MapPin, User } from "lucide-react";
import {
  CATEGORIA_PRODOTTO_LABEL,
  CLIENTE_TIPO_LABEL,
  formatCHF,
  formatEUDate,
  daysUntil,
  type EvOfferta,
} from "./types";

const TIPO_BADGE_COLOR: Record<string, string> = {
  privato: "#6366f1",
  azienda: "#0ea5e9",
  ente: "#16a34a",
};

function CardShell({
  accent,
  children,
  onClick,
}: {
  accent: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
        onClick && "cursor-pointer"
      )}
      style={{ borderLeftWidth: 4, borderLeftColor: accent }}
    >
      {children}
    </div>
  );
}

export function OffertaCard({ offerta }: { offerta: EvOfferta }) {
  const tipo = offerta.cliente?.tipo;
  return (
    <CardShell accent="#f59e0b">
      <p className="mb-1 line-clamp-2 text-sm font-semibold text-foreground">
        {offerta.titolo}
      </p>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {offerta.cliente ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {offerta.cliente.nome}
          </span>
        ) : null}
        {tipo ? (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium text-background"
            style={{ backgroundColor: TIPO_BADGE_COLOR[tipo] }}
          >
            {CLIENTE_TIPO_LABEL[tipo]}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5">
          {CATEGORIA_PRODOTTO_LABEL[offerta.categoria_prodotto]}
        </span>
        <span className="font-semibold text-foreground">
          {formatCHF(offerta.importo_offerto)}
        </span>
      </div>
      {offerta.data_evento_prevista ? (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          {formatEUDate(offerta.data_evento_prevista)}
        </div>
      ) : null}
    </CardShell>
  );
}

export interface EventoCardData {
  id: string;
  titolo: string;
  data_evento: string | null;
  tipo_evento: "pvt" | "public";
  locationNome: string | null;
  taskTotal: number;
  taskDone: number;
  /** True when a key artist supplier is not confirmed and event is <14 days out. */
  artistaAlert: boolean;
}

export function EventoCard({
  evento,
  onClick,
}: {
  evento: EventoCardData;
  onClick?: () => void;
}) {
  const pct =
    evento.taskTotal > 0
      ? Math.round((evento.taskDone / evento.taskTotal) * 100)
      : 0;
  const dLeft = daysUntil(evento.data_evento);
  const accent = evento.tipo_evento === "pvt" ? "#6366f1" : "#0ea5e9";

  return (
    <CardShell accent={accent} onClick={onClick}>
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-semibold text-foreground">
          {evento.titolo}
        </p>
        {evento.artistaAlert ? (
          <span title="Artista non confermato a meno di 14 giorni">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          </span>
        ) : null}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {evento.data_evento ? (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatEUDate(evento.data_evento)}
          </span>
        ) : null}
        {dLeft != null ? (
          <span
            className={cn(
              "rounded px-1.5 py-0.5",
              dLeft < 0
                ? "bg-muted text-muted-foreground"
                : dLeft <= 14
                  ? "bg-destructive/15 text-destructive"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {dLeft < 0 ? `${Math.abs(dLeft)}g fa` : `tra ${dLeft}g`}
          </span>
        ) : null}
      </div>
      {evento.locationNome ? (
        <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="line-clamp-1">{evento.locationNome}</span>
        </div>
      ) : null}
      <div>
        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Task</span>
          <span>
            {evento.taskDone}/{evento.taskTotal} ({pct}%)
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </CardShell>
  );
}

export interface AccountingCardData {
  id: string;
  titolo: string;
  data_evento: string | null;
  totaleIn: number;
  totaleOut: number;
}

export function AccountingCard({
  evento,
  onClick,
}: {
  evento: AccountingCardData;
  onClick?: () => void;
}) {
  const margine = evento.totaleOut - evento.totaleIn;
  return (
    <CardShell accent="#0f766e" onClick={onClick}>
      <p className="mb-2 line-clamp-2 text-sm font-semibold text-foreground">
        {evento.titolo}
      </p>
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Fatture IN</span>
          <span className="text-foreground">{formatCHF(evento.totaleIn)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Fatture OUT</span>
          <span className="text-foreground">{formatCHF(evento.totaleOut)}</span>
        </div>
        <div className="flex items-center justify-between border-t pt-1">
          <span className="font-medium text-muted-foreground">Margine</span>
          <span
            className={cn(
              "font-semibold",
              margine >= 0 ? "text-success" : "text-destructive"
            )}
          >
            {formatCHF(margine)}
          </span>
        </div>
      </div>
    </CardShell>
  );
}
