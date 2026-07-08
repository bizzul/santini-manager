import Link from "next/link";
import { AlertTriangle, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysUntil, formatEUDate } from "./types";
import type { EventoCardData } from "./cards";

export default function ProssimiEventiCard({
  eventi,
  domain,
}: {
  eventi: EventoCardData[];
  domain: string;
}) {
  if (eventi.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nessun evento in programma.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {eventi.map((e) => {
        const dLeft = daysUntil(e.data_evento);
        const pct =
          e.taskTotal > 0
            ? Math.round((e.taskDone / e.taskTotal) * 100)
            : 0;
        return (
          <li key={e.id}>
            <Link
              href={`/sites/${domain}/momentum/eventi/${e.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card/60 p-3 transition-colors hover:bg-muted"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                  {e.titolo}
                  {e.artistaAlert ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                  ) : null}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {formatEUDate(e.data_evento)} · Task {pct}%
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                  dLeft != null && dLeft <= 14
                    ? "bg-destructive/15 text-destructive"
                    : "bg-primary/15 text-primary"
                )}
              >
                {dLeft != null ? `tra ${dLeft}g` : "—"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
