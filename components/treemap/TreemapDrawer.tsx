"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  TM_SALUTE_COLORS,
  TM_SALUTE_LABELS,
} from "@/lib/treemap/constants";
import type {
  TreemapAlberoMapRow,
  TreemapAlberoStatoResponse,
} from "@/lib/treemap-data";
import TreemapSensoreCard, {
  sortSensoriByStato,
} from "@/components/treemap/TreemapSensoreCard";
import { ExternalLink, Loader2 } from "lucide-react";

interface TreemapDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  alberoSummary: TreemapAlberoMapRow | null;
  data: TreemapAlberoStatoResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const STATO_ALBERO_LABELS: Record<string, string> = {
  ATTIVO: "Attivo",
  IN_OSSERVAZIONE: "In osservazione",
  RIMOSSO: "Rimosso",
};

export default function TreemapDrawer({
  open,
  onOpenChange,
  domain,
  alberoSummary,
  data,
  loading,
  error,
  onRetry,
}: TreemapDrawerProps) {
  const isMobile = useIsMobile();
  const [expandedSensoreId, setExpandedSensoreId] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    if (!open) setExpandedSensoreId(null);
  }, [open]);

  const albero = data?.albero ?? alberoSummary;
  const sensori = data ? sortSensoriByStato(data.sensori) : [];
  const salute = albero?.stato_salute ?? "SCONOSCIUTO";

  const anagraficaParts: string[] = [];
  if (data?.albero?.altezza_m != null) {
    anagraficaParts.push(`${data.albero.altezza_m} m`);
  }
  if (data?.albero?.diametro_tronco_cm != null) {
    anagraficaParts.push(`${data.albero.diametro_tronco_cm} cm diametro`);
  }
  if (data?.albero?.anno_piantumazione != null) {
    anagraficaParts.push(`piantato ${data.albero.anno_piantumazione}`);
  }
  if (data?.albero?.stato_albero) {
    anagraficaParts.push(
      STATO_ALBERO_LABELS[data.albero.stato_albero] ?? data.albero.stato_albero,
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={
          isMobile
            ? "max-h-[85vh] overflow-y-auto rounded-t-xl"
            : "w-full overflow-y-auto sm:max-w-[420px]"
        }
      >
        {albero ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex flex-wrap items-center gap-2 pr-6">
                <span>{albero.codice}</span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: TM_SALUTE_COLORS[salute] }}
                >
                  {TM_SALUTE_LABELS[salute]}
                </span>
              </SheetTitle>
              <SheetDescription asChild>
                <div>
                  <p className="text-base text-foreground">{albero.specie_comune}</p>
                  {albero.specie_botanica ? (
                    <p className="italic text-muted-foreground">
                      {albero.specie_botanica}
                    </p>
                  ) : null}
                  {(albero.indirizzo || albero.comune) && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[albero.indirizzo, albero.comune].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              {anagraficaParts.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {anagraficaParts.join(" · ")}
                </p>
              ) : null}

              {(data?.albero?.cliente_nome && data.albero.client_id) ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">Cliente </span>
                  <Link
                    href={`/sites/${domain}/clients/edit/${data.albero.client_id}`}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    {data.albero.cliente_nome}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </p>
              ) : null}

              {(data?.albero?.task_titolo && data.albero.task_id) ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">Progetto </span>
                  <Link
                    href={`/sites/${domain}/progetti/${data.albero.task_id}`}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    {data.albero.task_titolo}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </p>
              ) : null}

              <Separator />

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Caricamento sensori…
                </div>
              ) : error ? (
                <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                    Riprova
                  </Button>
                </div>
              ) : sensori.length === 0 ? (
                <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Nessun sensore installato su questo albero.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">
                    Sensori ({sensori.length})
                  </p>
                  {sensori.map((s) => (
                    <TreemapSensoreCard
                      key={s.sensore_id}
                      sensore={s}
                      domain={domain}
                      expanded={expandedSensoreId === s.sensore_id}
                      onToggle={() =>
                        setExpandedSensoreId((cur) =>
                          cur === s.sensore_id ? null : s.sensore_id,
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
