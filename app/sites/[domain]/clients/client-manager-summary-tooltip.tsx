"use client";

import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

type SummaryBucket = {
  count: number;
  totalValue: number;
};

type ClientManagerSummary = {
  offersSent: SummaryBucket;
  offersWon: SummaryBucket;
  offersLost: SummaryBucket;
  projectsInProgress: SummaryBucket;
  projectsCompleted: SummaryBucket;
};

function formatSwissCurrency(value: number) {
  return new Intl.NumberFormat("it-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatBucket(bucket?: SummaryBucket) {
  const count = bucket?.count || 0;
  const label = count === 1 ? "elemento" : "elementi";
  return `${count} ${label} | ${formatSwissCurrency(bucket?.totalValue || 0)}`;
}

export function ClientManagerSummaryTooltip({
  clientId,
  domain,
  children,
}: {
  clientId: number;
  domain: string;
  children: React.ReactNode;
}) {
  const [summary, setSummary] = useState<ClientManagerSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    if (loaded || loading) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/clients/${clientId}/manager-summary`, {
        headers: {
          "x-site-domain": domain,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Errore caricamento riepilogo");
      }

      const payload = await response.json();
      setSummary(payload);
      setLoaded(true);
    } catch (fetchError: any) {
      setError(fetchError?.message || "Errore caricamento riepilogo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span onMouseEnter={loadSummary} onFocus={loadSummary}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[320px] p-3" side="top" sideOffset={6}>
        <div className="space-y-2">
          <div className="font-medium">Riepilogo manager cliente</div>

          {loading ? (
            <div className="flex items-center gap-2 text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Caricamento dati...</span>
            </div>
          ) : error ? (
            <div className="text-xs">{error}</div>
          ) : (
            <div className="space-y-1 text-xs">
              <div>Offerte inviate: {formatBucket(summary?.offersSent)}</div>
              <div>Offerte vinte: {formatBucket(summary?.offersWon)}</div>
              <div>Offerte perse: {formatBucket(summary?.offersLost)}</div>
              <div>Progetti in corso: {formatBucket(summary?.projectsInProgress)}</div>
              <div>Progetti ultimati: {formatBucket(summary?.projectsCompleted)}</div>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
