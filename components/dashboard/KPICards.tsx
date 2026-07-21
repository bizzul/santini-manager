"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { FileText, Factory, Receipt, TrendingUp } from "lucide-react";
import { DashboardStats } from "@/lib/server-data";

interface KPICardsProps {
  data: DashboardStats;
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

function CardHeader({
  icon,
  iconWrapperClass,
  title,
}: {
  icon: ReactNode;
  iconWrapperClass: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconWrapperClass}`}
      >
        {icon}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
    </div>
  );
}

function CardShell({
  href,
  children,
}: {
  href: string | null;
  children: ReactNode;
}) {
  const panelClassName = "dashboard-panel p-5 relative overflow-hidden";
  if (href) {
    return (
      <Link
        href={href}
        className={`${panelClassName} block transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        {children}
      </Link>
    );
  }
  return <div className={panelClassName}>{children}</div>;
}

function SubMetric({
  label,
  count,
  value,
  href,
  tone = "neutral",
}: {
  label: string;
  count: number;
  value: number;
  href?: string | null;
  tone?: "neutral" | "orange" | "green";
}) {
  const toneClass =
    tone === "orange"
      ? "bg-orange-500/15 border-orange-400/50"
      : tone === "green"
      ? "bg-emerald-500/15 border-emerald-400/50"
      : "bg-foreground/[0.10] border-foreground/40";
  const base = `rounded-lg border p-3 flex flex-col min-h-[96px] ${toneClass}`;
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-base font-semibold text-foreground">{label}</p>
        <span className="rounded-md border border-foreground/40 px-2 py-0.5 text-base font-semibold leading-none text-foreground">
          {count}
        </span>
      </div>
      <p className="mt-auto pt-2 text-center text-xl font-bold text-foreground">
        {formatCurrency(value)}
      </p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`${base} transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        {inner}
      </Link>
    );
  }
  return <div className={base}>{inner}</div>;
}

export default function KPICards({ data, domain }: KPICardsProps) {
  const { offers, production, invoices, avor, links } = data.overviewKpis;

  const kanbanHref = (identifier: string | null): string | null =>
    identifier
      ? `/sites/${domain}/kanban?name=${encodeURIComponent(identifier)}`
      : null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Offerte */}
      <CardShell href={kanbanHref(links.offers)}>
        <CardHeader
          icon={<FileText className="w-5 h-5 text-blue-500" />}
          iconWrapperClass="bg-blue-500/20"
          title="Offerte"
        />
        <div className="grid grid-cols-2 gap-2.5">
          <SubMetric
            label="Inviate"
            count={offers.inviate.count}
            value={offers.inviate.value}
            tone="orange"
          />
          <SubMetric
            label="In trattativa"
            count={offers.inTrattativa.count}
            value={offers.inTrattativa.value}
            tone="green"
          />
        </div>
      </CardShell>

      {/* AVOR */}
      <CardShell href={null}>
        <CardHeader
          icon={<TrendingUp className="w-5 h-5 text-orange-500" />}
          iconWrapperClass="bg-orange-500/20"
          title="AVOR"
        />
        <div className="grid grid-cols-2 gap-2.5">
          <SubMetric
            label="Vinte"
            count={offers.vinte.count}
            value={offers.vinte.value}
            href={kanbanHref(links.offers)}
            tone="orange"
          />
          <SubMetric
            label="Progetti"
            count={avor.projectCount}
            value={avor.totalValue}
            href={kanbanHref(links.avor)}
            tone="green"
          />
        </div>
      </CardShell>

      {/* Produzione */}
      <CardShell href={null}>
        <CardHeader
          icon={<Factory className="w-5 h-5 text-white" />}
          iconWrapperClass="bg-white/20"
          title="Produzione"
        />
        <div className="grid grid-cols-2 gap-2.5">
          <SubMetric
            label="In produzione"
            count={production.inProduzione.count}
            value={production.inProduzione.value}
            href={kanbanHref(links.production)}
            tone="orange"
          />
          <SubMetric
            label="Posa"
            count={production.posa.count}
            value={production.posa.value}
            href={kanbanHref(links.posa)}
            tone="green"
          />
        </div>
      </CardShell>

      {/* Fatture */}
      <CardShell href={kanbanHref(links.invoices)}>
        <CardHeader
          icon={<Receipt className="w-5 h-5 text-green-500" />}
          iconWrapperClass="bg-green-500/20"
          title="Fatture"
        />
        <div className="grid grid-cols-2 gap-2.5">
          <SubMetric
            label="Da inviare"
            count={invoices.daInviare.count}
            value={invoices.daInviare.value}
            tone="orange"
          />
          <SubMetric
            label="Inviate"
            count={invoices.inviate.count}
            value={invoices.inviate.value}
            tone="green"
          />
        </div>
      </CardShell>
    </div>
  );
}
