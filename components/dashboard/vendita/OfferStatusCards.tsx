"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { VenditaDashboardStats } from "@/lib/server-data";

interface OfferStatusCardsProps {
  data: VenditaDashboardStats["offerStatus"];
  kanbanIdentifier: string | null;
  domain: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `CHF ${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `CHF ${(value / 1000).toFixed(0)}k`;
  }
  return `CHF ${value.toFixed(0)}`;
}

const boxBase =
  "rounded-lg border p-3 flex flex-col min-h-[104px]";

type Tone = "neutral" | "orange" | "yellow" | "green" | "red";

// Inline colors (rgba) so the tints are not purged by Tailwind in production.
const TONE_STYLE: Record<
  Tone,
  { backgroundColor: string; borderColor: string } | undefined
> = {
  neutral: undefined,
  orange: {
    backgroundColor: "rgba(249, 115, 22, 0.35)",
    borderColor: "rgba(251, 146, 60, 0.7)",
  },
  yellow: {
    backgroundColor: "rgba(234, 179, 8, 0.35)",
    borderColor: "rgba(250, 204, 21, 0.7)",
  },
  green: {
    backgroundColor: "rgba(34, 197, 94, 0.35)",
    borderColor: "rgba(74, 222, 128, 0.7)",
  },
  red: {
    backgroundColor: "rgba(239, 68, 68, 0.35)",
    borderColor: "rgba(248, 113, 113, 0.7)",
  },
};

function BoxShell({
  href,
  tone = "neutral",
  children,
}: {
  href: string | null;
  tone?: Tone;
  children: ReactNode;
}) {
  const isNeutral = tone === "neutral";
  const className = `${boxBase} ${
    isNeutral ? "bg-foreground/[0.10] border-foreground/40" : ""
  } transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`;
  const style = TONE_STYLE[tone];

  if (href) {
    return (
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

function BoxHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <p className="text-base font-semibold text-foreground">{label}</p>
      <span className="rounded-md border border-foreground/40 px-2 py-0.5 text-base font-semibold leading-none text-foreground">
        {count}
      </span>
    </div>
  );
}

function StatusBox({
  label,
  count,
  value,
  href,
  tone = "neutral",
}: {
  label: string;
  count: number;
  value: number;
  href: string | null;
  tone?: Tone;
}) {
  return (
    <BoxShell href={href} tone={tone}>
      <BoxHeader label={label} count={count} />
      <p className="mt-auto pt-2 text-center text-xl font-bold text-foreground">
        {formatCurrency(value)}
      </p>
    </BoxShell>
  );
}

function TodoBox({
  count,
  ritardo,
  oggi,
  nonScadute,
  href,
}: {
  count: number;
  ritardo: number;
  oggi: number;
  nonScadute: number;
  href: string | null;
}) {
  return (
    <BoxShell href={href}>
      <BoxHeader label="To Do" count={count} />
      <div className="mt-auto grid grid-cols-3 gap-1.5 pt-2">
        <div
          title="In ritardo"
          className="rounded-md bg-red-500 py-1.5 text-center text-base font-bold text-white"
        >
          {ritardo}
        </div>
        <div
          title="Da fare oggi"
          className="rounded-md py-1.5 text-center text-base font-bold text-black"
          style={{ backgroundColor: "#fde047" }}
        >
          {oggi}
        </div>
        <div
          title="Non scadute"
          className="rounded-md bg-emerald-500 py-1.5 text-center text-base font-bold text-white"
        >
          {nonScadute}
        </div>
      </div>
    </BoxShell>
  );
}

export default function OfferStatusCards({
  data,
  kanbanIdentifier,
  domain,
}: OfferStatusCardsProps) {
  const kanbanHref = kanbanIdentifier
    ? `/sites/${domain}/kanban?name=${encodeURIComponent(kanbanIdentifier)}`
    : null;

  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <Layers className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Stato Offerte</h3>
          <p className="text-xs text-muted-foreground">
            Panoramica delle offerte per stato
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <TodoBox
          count={data.todo.count}
          ritardo={data.todo.ritardo}
          oggi={data.todo.oggi}
          nonScadute={data.todo.nonScadute}
          href={kanbanHref}
        />
        <StatusBox
          label="Inviate"
          count={data.inviate.count}
          value={data.inviate.value}
          href={kanbanHref}
          tone="orange"
        />
        <StatusBox
          label="In Trattativa"
          count={data.inTrattativa.count}
          value={data.inTrattativa.value}
          href={kanbanHref}
          tone="yellow"
        />
        <StatusBox
          label="Vinte"
          count={data.vinte.count}
          value={data.vinte.value}
          href={kanbanHref}
          tone="green"
        />
        <StatusBox
          label="Perse"
          count={data.perse.count}
          value={data.perse.value}
          href={kanbanHref}
          tone="red"
        />
      </div>
    </div>
  );
}
