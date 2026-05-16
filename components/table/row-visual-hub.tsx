"use client";

import {
  BriefcaseBusiness,
  CheckCircle2,
  CircleDot,
  FileText,
  Layers3,
  TrendingUp,
} from "lucide-react";
import type { RowVisualInsight, RowVisualInsightTone } from "@/types/supabase";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RowVisualHubVariant = "stack" | "isometric" | "radar";

interface RowVisualHubProps {
  insight?: RowVisualInsight | null;
  label?: string;
  variant?: RowVisualHubVariant;
}

const emptyInsight: RowVisualInsight = {
  entityId: 0,
  entityType: "generic",
  documents: {
    total: 0,
    byType: [],
    recent: [],
  },
  offers: {
    open: 0,
    won: 0,
    lost: 0,
    total: 0,
  },
  projects: {
    active: 0,
    completed: 0,
    total: 0,
  },
  agreements: {
    open: 0,
    defined: 0,
    total: 0,
  },
  totalValue: 0,
  lastActivity: null,
};

const toneClass: Record<RowVisualInsightTone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  active: "bg-sky-500/15 text-sky-300 border-sky-400/25",
  success: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25",
  warning: "bg-amber-500/15 text-amber-300 border-amber-400/25",
  danger: "bg-rose-500/15 text-rose-300 border-rose-400/25",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("it-CH", {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function totalSignals(insight: RowVisualInsight) {
  return (
    insight.documents.total +
    insight.offers.total +
    insight.projects.total +
    insight.agreements.total
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof FileText;
  label: string;
  value: number | string;
  tone?: RowVisualInsightTone;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-2.5 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <div className={cn("mt-1 text-lg font-semibold", toneClass[tone])}>
        <span className="bg-transparent text-current">{value}</span>
      </div>
    </div>
  );
}

function HubGlyph({
  insight,
  variant,
}: {
  insight: RowVisualInsight;
  variant: RowVisualHubVariant;
}) {
  const signalTotal = totalSignals(insight);
  const hasData = signalTotal > 0;

  if (variant === "radar") {
    return (
      <div className="relative h-14 w-14 rounded-full border border-primary/20 bg-background shadow-inner">
        <div className="absolute inset-1 rounded-full border border-sky-400/30" />
        <div className="absolute inset-2 rounded-full border border-emerald-400/30" />
        <div className="absolute inset-3 rounded-full border border-amber-400/30" />
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
          {signalTotal}
        </span>
      </div>
    );
  }

  if (variant === "isometric") {
    return (
      <div className="relative h-14 w-14 [perspective:120px]">
        <div className="absolute inset-1 rounded-xl border border-primary/25 bg-linear-to-br from-sky-500/25 via-primary/20 to-emerald-500/20 shadow-[0_12px_24px_rgba(14,165,233,0.18)] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:rotate-3 motion-reduce:transition-none" />
        <div className="absolute left-2 right-2 top-2 h-6 rounded-lg border border-white/10 bg-background/85 shadow-sm" />
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-semibold">
          <FileText className="h-3 w-3 text-sky-300" />
          <span>{signalTotal}</span>
          <BriefcaseBusiness className="h-3 w-3 text-emerald-300" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-14 w-14 overflow-hidden rounded-xl border bg-background shadow-sm transition-all duration-200 motion-reduce:transition-none",
        hasData
          ? "border-primary/25 shadow-primary/10 group-hover:shadow-lg group-hover:shadow-primary/20"
          : "border-border opacity-70"
      )}
    >
      <div className="absolute inset-0 bg-linear-to-br from-sky-500/20 via-primary/10 to-emerald-500/20" />
      <div className="absolute left-1.5 top-1.5 rounded-md bg-background/80 p-1 shadow-sm">
        <FileText className="h-3.5 w-3.5 text-sky-300" />
      </div>
      <div className="absolute right-1.5 top-1.5 rounded-md bg-background/80 p-1 shadow-sm">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
      </div>
      <div className="absolute bottom-1 left-1.5 rounded-md bg-background/80 p-1 shadow-sm">
        <Layers3 className="h-3.5 w-3.5 text-amber-300" />
      </div>
      <span className="absolute bottom-1.5 right-2 text-sm font-bold">
        {signalTotal}
      </span>
    </div>
  );
}

export function RowVisualHub({
  insight,
  label = "Apri sintesi riga",
  variant = "stack",
}: RowVisualHubProps) {
  const normalizedInsight = insight ?? emptyInsight;
  const documentTypes = normalizedInsight.documents.byType.slice(0, 4);
  const recentDocuments = normalizedInsight.documents.recent.slice(0, 3);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="group flex h-14 w-14 items-center justify-center rounded-xl outline-none ring-offset-background transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          <HubGlyph insight={normalizedInsight} variant={variant} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 p-0">
        <div className="overflow-hidden rounded-md">
          <div className="border-b bg-linear-to-br from-primary/15 via-background to-sky-500/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Sintesi riga
                </p>
                <h3 className="mt-1 text-base font-semibold">
                  Documenti e accordi
                </h3>
              </div>
              <Badge variant="outline" className="bg-background/70">
                {formatCurrency(normalizedInsight.totalValue)}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-4">
            <StatTile
              icon={FileText}
              label="Documenti"
              value={normalizedInsight.documents.total}
              tone="active"
            />
            <StatTile
              icon={TrendingUp}
              label="Offerte"
              value={normalizedInsight.offers.total}
              tone="warning"
            />
            <StatTile
              icon={BriefcaseBusiness}
              label="Progetti"
              value={normalizedInsight.projects.total}
              tone="success"
            />
            <StatTile
              icon={CheckCircle2}
              label="Accordi"
              value={normalizedInsight.agreements.total}
              tone="neutral"
            />
          </div>

          <div className="space-y-4 border-t p-4">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-muted/50 p-2">
                <div className="font-semibold">{normalizedInsight.offers.open}</div>
                <div className="text-muted-foreground">aperte</div>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <div className="font-semibold text-emerald-300">
                  {normalizedInsight.offers.won}
                </div>
                <div className="text-muted-foreground">vinte</div>
              </div>
              <div className="rounded-lg bg-rose-500/10 p-2">
                <div className="font-semibold text-rose-300">
                  {normalizedInsight.offers.lost}
                </div>
                <div className="text-muted-foreground">perse</div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <CircleDot className="h-3.5 w-3.5" />
                Tipologie documenti
              </div>
              {documentTypes.length ? (
                <div className="flex flex-wrap gap-2">
                  {documentTypes.map((item) => (
                    <Badge
                      key={item.label}
                      variant="outline"
                      className={cn("border", toneClass[item.tone ?? "neutral"])}
                    >
                      {item.label}: {item.count}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nessun documento collegato.
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ultimi documenti
              </div>
              {recentDocuments.length ? (
                <div className="space-y-2">
                  {recentDocuments.map((document) => (
                    <a
                      key={document.id}
                      href={document.url ?? undefined}
                      target={document.url ? "_blank" : undefined}
                      rel={document.url ? "noreferrer" : undefined}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border p-2 text-sm transition-colors",
                        document.url
                          ? "hover:bg-muted"
                          : "pointer-events-none text-muted-foreground"
                      )}
                    >
                      <span className="truncate">{document.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {document.type}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nessun documento recente.
                </p>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
