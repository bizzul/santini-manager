"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CalendarClock, Check, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { usePmContext } from "@/components/personal-manager/pm-context";
import {
  postponeItem,
  setItemStatus,
} from "@/app/personale/actions";
import {
  getAreaDef,
  ITEM_STATUS_LABELS,
  type PmItem,
} from "@/lib/personal-manager/types";

interface ItemCardProps {
  item: PmItem;
  showArea?: boolean;
  canEdit?: boolean;
}

const PRIORITY_LABELS: Record<number, string> = {
  1: "Bassa",
  2: "Medio-bassa",
  3: "Media",
  4: "Alta",
  5: "Urgente",
};

export function ItemCard({ item, showArea = false, canEdit = false }: ItemCardProps) {
  const router = useRouter();
  const { base } = usePmContext();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const area = getAreaDef(item.area_slug);

  const done = item.status === "done";

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      try {
        await fn();
      } catch (err) {
        toast({
          title: "Errore",
          description: err instanceof Error ? err.message : "Riprova piu' tardi",
          variant: "destructive",
        });
      }
    });

  return (
    <div className="flex overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <span
        className="w-1.5 shrink-0"
        style={{ backgroundColor: area?.accent ?? "#9ca3af" }}
        aria-hidden
      />
      <div className="min-w-0 flex-1 p-3">
        <button
          type="button"
          onClick={() => router.push(`${base}/item/${item.id}`)}
          className="block w-full text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "line-clamp-2 text-sm font-medium text-foreground",
                done && "text-muted-foreground line-through",
              )}
            >
              {item.title}
            </p>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: area?.accentSoft,
                color: area?.accent,
              }}
            >
              P{item.priority}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {showArea && area ? (
              <span className="font-medium" style={{ color: area.accent }}>
                {area.label}
              </span>
            ) : null}
            <span>{PRIORITY_LABELS[item.priority] ?? "Media"}</span>
            {item.due_date ? (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                {new Date(item.due_date).toLocaleDateString("it-IT")}
              </span>
            ) : null}
            <span className="rounded bg-muted px-1.5 py-0.5">
              {ITEM_STATUS_LABELS[item.status]}
            </span>
          </div>
        </button>

        {canEdit && !done ? (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => setItemStatus(item.id, "done"))}
              className="inline-flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-surface px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Completa
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => postponeItem(item.id, 1))}
              className="inline-flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-surface px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Clock3 className="h-3.5 w-3.5" />
              Posticipa
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
