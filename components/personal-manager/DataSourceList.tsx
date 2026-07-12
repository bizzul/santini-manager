"use client";

import { useState, useTransition } from "react";
import { Database } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { toggleDataSourceSync } from "@/app/personale/actions";
import { getAreaDef, type PmDataSource } from "@/lib/personal-manager/types";

const TYPE_LABELS: Record<string, string> = {
  internal: "DB Manager",
  external: "Piattaforma esterna",
  wearable: "Wearable",
  accounting: "Contabilita'",
  calendar: "Calendario",
  manual: "Manuale",
};

export function DataSourceList({ sources }: { sources: PmDataSource[] }) {
  const { toast } = useToast();
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(sources.map((s) => [s.id, s.sync_enabled])),
  );
  const [isPending, startTransition] = useTransition();

  const onToggle = (id: string, next: boolean) => {
    setState((prev) => ({ ...prev, [id]: next }));
    startTransition(async () => {
      try {
        await toggleDataSourceSync(id, next);
      } catch (err) {
        setState((prev) => ({ ...prev, [id]: !next }));
        toast({
          title: "Errore",
          description: err instanceof Error ? err.message : "Riprova piu' tardi",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-2">
      {sources.map((source) => {
        const area = source.area_slug ? getAreaDef(source.area_slug) : undefined;
        return (
          <div
            key={source.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: area?.accentSoft ?? "var(--muted)",
                color: area?.accent ?? undefined,
              }}
            >
              <Database className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {source.name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {TYPE_LABELS[source.type] ?? source.type}
                {area ? ` · ${area.label}` : " · Trasversale"}
              </p>
            </div>
            <Switch
              checked={state[source.id] ?? false}
              disabled={isPending}
              onCheckedChange={(v) => onToggle(source.id, v)}
              aria-label={`Sincronizzazione ${source.name}`}
            />
          </div>
        );
      })}
    </div>
  );
}
