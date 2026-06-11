"use client";

import { AlertTriangle, CircleCheck, CircleDashed } from "lucide-react";

export type HealthStatus = "ok" | "warning" | "incomplete";

export interface HealthItem {
  label: string;
  value: string;
  status: HealthStatus;
  /** Key of the settings card to scroll to (matches SettingsOverviewCards). */
  cardKey: string;
}

const STATUS_ICONS: Record<HealthStatus, React.ComponentType<{ className?: string }>> = {
  ok: CircleCheck,
  warning: AlertTriangle,
  incomplete: CircleDashed,
};

const STATUS_STYLES: Record<HealthStatus, string> = {
  ok: "border-emerald-300/30 bg-emerald-500/10 text-emerald-200",
  warning: "border-amber-300/30 bg-amber-500/10 text-amber-200",
  incomplete: "border-orange-300/30 bg-orange-500/10 text-orange-200",
};

const STATUS_ICON_STYLES: Record<HealthStatus, string> = {
  ok: "text-emerald-300",
  warning: "text-amber-300",
  incomplete: "text-orange-300",
};

/**
 * Compact health overview of the site configuration, rendered above the
 * settings grid. Each pill links (scrolls) to the corresponding card.
 */
export default function SiteHealthBar({ items }: { items: HealthItem[] }) {
  if (items.length === 0) return null;

  const scrollToCard = (cardKey: string) => {
    document
      .getElementById(`site-setting-card-${cardKey}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => {
        const Icon = STATUS_ICONS[item.status];
        return (
          <button
            key={`${item.cardKey}-${item.label}`}
            type="button"
            onClick={() => scrollToCard(item.cardKey)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors hover:bg-white/10 ${STATUS_STYLES[item.status]}`}
          >
            <Icon className={`h-3.5 w-3.5 ${STATUS_ICON_STYLES[item.status]}`} />
            <span className="font-medium">{item.label}</span>
            <span className="opacity-80">{item.value}</span>
          </button>
        );
      })}
    </div>
  );
}
