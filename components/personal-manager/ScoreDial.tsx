"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { recordAreaScore } from "@/app/sites/[domain]/personal-manager/actions";
import { usePmContext } from "@/components/personal-manager/pm-context";
import type { AreaSlug } from "@/lib/personal-manager/types";

interface ScoreDialProps {
  area: AreaSlug;
  accent: string;
  current?: number;
  canEdit: boolean;
}

/** Slider 0-10 per registrare l'autovalutazione dell'area (append-only). */
export function ScoreDial({ area, accent, current, canEdit }: ScoreDialProps) {
  const { domain } = usePmContext();
  const { toast } = useToast();
  const [value, setValue] = useState<number>(current ?? 5);
  const [isPending, startTransition] = useTransition();

  const dirty = value !== (current ?? 5);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Autovalutazione
        </span>
        <span
          className="text-2xl font-extrabold tabular-nums"
          style={{ color: accent }}
        >
          {value}
          <span className="text-sm font-medium text-muted-foreground">/10</span>
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        disabled={!canEdit || isPending}
        onChange={(e) => setValue(Number(e.target.value))}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted disabled:cursor-not-allowed"
        style={{ accentColor: accent }}
        aria-label={`Punteggio area ${area}`}
      />
      {canEdit ? (
        <Button
          size="sm"
          className="mt-3 w-full"
          disabled={!dirty || isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await recordAreaScore(domain, area, value);
                toast({ title: "Punteggio aggiornato" });
              } catch (err) {
                toast({
                  title: "Errore",
                  description:
                    err instanceof Error ? err.message : "Riprova piu' tardi",
                  variant: "destructive",
                });
              }
            })
          }
        >
          {isPending ? "Salvataggio…" : "Salva punteggio"}
        </Button>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Non hai il permesso di modificare questa area.
        </p>
      )}
    </div>
  );
}
