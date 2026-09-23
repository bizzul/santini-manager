import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Stati semantici condivisi da tutti i moduli (template globale).
 * Colore = pallino + fondo tenue; il testo resta neutro per garantire
 * contrasto AA in entrambi i temi e leggibilita' anche senza colore.
 * Non va confuso con il bordo sinistro delle card Kanban, che codifica
 * la percentuale di progresso.
 */
export type StatusTone =
  | "late"
  | "progress"
  | "waiting"
  | "done"
  | "draft"
  | "invoiced";

const TONE_CLASSES: Record<StatusTone, { chip: string; dot: string }> = {
  late: {
    chip: "border-status-late/35 bg-status-late/10",
    dot: "bg-status-late",
  },
  progress: {
    chip: "border-status-progress/35 bg-status-progress/10",
    dot: "bg-status-progress",
  },
  waiting: {
    chip: "border-status-waiting/40 bg-status-waiting/10",
    dot: "bg-status-waiting",
  },
  done: {
    chip: "border-status-done/35 bg-status-done/10",
    dot: "bg-status-done",
  },
  draft: {
    chip: "border-status-draft/35 bg-status-draft/10",
    dot: "bg-status-draft",
  },
  invoiced: {
    chip: "border-status-invoiced/35 bg-status-invoiced/10",
    dot: "bg-status-invoiced",
  },
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone;
}

export function StatusBadge({
  tone,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const classes = TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-caption font-medium text-foreground",
        classes.chip,
        className
      )}
      {...props}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", classes.dot)} />
      {children}
    </span>
  );
}

/**
 * Semaforo readiness (es. Kanban Fatturazione): rosso finche' non e' pronto,
 * verde con visto quando lo e'. Etichetta obbligatoria per lettori di schermo.
 */
export function ReadinessDot({
  ready,
  label,
  className,
}: {
  ready: boolean;
  label: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-full ring-2 ring-background",
        ready ? "bg-readiness-ok text-success-foreground" : "bg-readiness-pending",
        className
      )}
    >
      {ready ? (
        <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
          <path
            d="M2.5 6.2 5 8.5l4.5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}
