"use client";

import {
  Bot,
  Box,
  Factory,
  FileText,
  GitBranch,
  Headset,
  Layers,
  LayoutDashboard,
  Orbit,
  Package,
  Palette,
  Settings,
  Users,
} from "lucide-react";
import SettingsHelpButton from "@/components/site-settings/SettingsHelpButton";
import { SITE_SETTINGS_GUIDES, type SiteSettingsGuideKey } from "@/lib/site-settings-guides";

type SummaryData = {
  modules?: { active: number; total: number };
  kanban?: { boards: number; columns: number };
  inventory?: { categories: number; items: number };
  products?: { categories: number; items: number };
  users?: { total: number };
  factory?: { departments: number; machines: number };
  hr?: { configuredRates: number };
  ai?: { provider: string | null; speechProvider: string | null; hasApiKey: boolean };
};

export type AdminCardStatus = "ok" | "warning" | "incomplete" | "inactive";

type CardGroup = "base" | "operational" | "system";

const GROUP_LABELS: Record<CardGroup, string> = {
  base: "Configurazione base",
  operational: "Dati operativi",
  system: "Sistema",
};

const GROUP_ORDER: CardGroup[] = ["base", "operational", "system"];

const STATUS_STYLES: Record<AdminCardStatus, string> = {
  ok: "border-emerald-300/40 bg-emerald-500/15 text-emerald-200",
  warning: "border-amber-300/40 bg-amber-500/15 text-amber-200",
  incomplete: "border-orange-300/40 bg-orange-500/15 text-orange-200",
  inactive: "border-slate-400/40 bg-slate-500/15 text-slate-300",
};

const STATUS_DEFAULT_LABELS: Record<AdminCardStatus, string> = {
  ok: "Configurato",
  warning: "Attenzione",
  incomplete: "Da configurare",
  inactive: "Disattivato",
};

interface SettingsOverviewCard {
  key: string;
  title: string;
  description: string;
  guideKey: SiteSettingsGuideKey;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  action: React.ReactNode;
  group: CardGroup;
  status?: AdminCardStatus;
  /** Optional contextual label overriding the default status label. */
  statusLabel?: string;
  className?: string;
}

interface SettingsOverviewCardsProps {
  summary: SummaryData | null;
  moduleAction: React.ReactNode;
  codesAction: React.ReactNode;
  productsAction: React.ReactNode;
  kanbanAction: React.ReactNode;
  factoryAction: React.ReactNode;
  inventoryAction: React.ReactNode;
  hrAction: React.ReactNode;
  aiAction: React.ReactNode;
  documentTemplateAction: React.ReactNode;
  themeAction: React.ReactNode;
  supportAction: React.ReactNode;
  dashboardAction: React.ReactNode;
  /** Trigger for the 3D Desk View (Command Deck) per-site toggle modal. */
  commandDeckAction: React.ReactNode;
  /** Current persisted state of the Command Deck flag, used for the badge. */
  commandDeckEnabled: boolean;
  /** Trigger for the home flowchart ("Vista Diagramma") settings modal. */
  flowchartAction: React.ReactNode;
  /** Current persisted state of the flowchart flag, used for the badge. */
  flowchartEnabled: boolean;
}

export default function SettingsOverviewCards({
  summary,
  moduleAction,
  codesAction,
  productsAction,
  kanbanAction,
  factoryAction,
  inventoryAction,
  hrAction,
  aiAction,
  documentTemplateAction,
  themeAction,
  supportAction,
  dashboardAction,
  commandDeckAction,
  commandDeckEnabled,
  flowchartAction,
  flowchartEnabled,
}: SettingsOverviewCardsProps) {
  // Contextual statuses, computed from real data when the summary is loaded.
  const factoryConfigured =
    (summary?.factory?.departments ?? 0) > 0 ||
    (summary?.factory?.machines ?? 0) > 0;
  const inventoryHasItems = (summary?.inventory?.items ?? 0) > 0;
  const hrHasRates = (summary?.hr?.configuredRates ?? 0) > 0;

  const cards: SettingsOverviewCard[] = [
    {
      key: "modules",
      title: "Moduli",
      description: "Decidi quali aree del gestionale sono disponibili per questo spazio.",
      guideKey: "modules",
      icon: Settings,
      badge: `${summary?.modules?.active ?? 0}/${summary?.modules?.total ?? 0} attivi`,
      action: moduleAction,
      group: "base",
      status: summary ? "ok" : undefined,
    },
    {
      key: "codes",
      title: "Codici",
      description: "Imposta formato dei codici e regole per il flusso offerte.",
      guideKey: "codes",
      icon: Box,
      badge: "Template e regole",
      action: codesAction,
      group: "base",
      status: "ok",
    },
    {
      key: "products",
      title: "Prodotti",
      description: "Configura categorie prodotto, immagine, colore e fornitori suggeriti.",
      guideKey: "products",
      icon: Package,
      badge: `${summary?.products?.categories ?? 0} categorie, ${summary?.products?.items ?? 0} prodotti`,
      action: productsAction,
      group: "operational",
      status: summary
        ? (summary.products?.items ?? 0) > 0
          ? "ok"
          : "incomplete"
        : undefined,
    },
    {
      key: "kanban",
      title: "Kanban",
      description: "Organizza le bacheche in categorie chiare per area di lavoro.",
      guideKey: "kanban",
      icon: Layers,
      badge: `${summary?.kanban?.boards ?? 0} kanban, ${summary?.kanban?.columns ?? 0} colonne`,
      action: kanbanAction,
      group: "operational",
      status: summary
        ? (summary.kanban?.boards ?? 0) > 0
          ? "ok"
          : "incomplete"
        : undefined,
    },
    {
      key: "factory",
      title: "Fabbrica",
      description: "Definisci reparti, macchinari e costo orario di produzione.",
      guideKey: "factory",
      icon: Factory,
      badge: `${summary?.factory?.departments ?? 0} reparti, ${summary?.factory?.machines ?? 0} macchinari`,
      action: factoryAction,
      group: "operational",
      status: summary ? (factoryConfigured ? "ok" : "incomplete") : undefined,
    },
    {
      key: "inventory",
      title: "Inventario",
      description: "Raggruppa il magazzino in categorie facili da cercare e filtrare.",
      guideKey: "inventory",
      icon: Box,
      badge: `${summary?.inventory?.categories ?? 0} categorie, ${summary?.inventory?.items ?? 0} articoli`,
      action: inventoryAction,
      group: "operational",
      status: summary ? (inventoryHasItems ? "ok" : "warning") : undefined,
      statusLabel: summary && !inventoryHasItems ? "Nessun articolo" : undefined,
    },
    {
      key: "hr",
      title: "HR",
      description: "Controlla utenti attivi, costo orario e accessi ai moduli.",
      guideKey: "hr",
      icon: Users,
      badge: `${summary?.users?.total ?? 0} utenti, ${summary?.hr?.configuredRates ?? 0} costi definiti`,
      action: hrAction,
      group: "base",
      status: summary ? (hrHasRates ? "ok" : "warning") : undefined,
      statusLabel: summary && !hrHasRates ? "Costi mancanti" : undefined,
    },
    {
      key: "theme",
      title: "Colori & modalita",
      description: "Definisci palette e modalita light/dark/adaptive per il sito.",
      guideKey: "theme",
      icon: Palette,
      badge: "Tema e contrasti",
      action: themeAction,
      group: "base",
      status: "ok",
    },
    {
      key: "support",
      title: "Assistenza e abbonamenti",
      description:
        "Visualizza stato abbonamento e apri assistenza specifica istantanea.",
      guideKey: "support",
      icon: Headset,
      badge: "Supporto immediato",
      action: supportAction,
      group: "system",
      status: "ok",
      className: "border-emerald-300/25 bg-emerald-500/10",
    },
    {
      key: "dashboard",
      title: "Dashboard",
      description:
        "Scegli dashboard attive e sequenze domande per My 1° Dashboard.",
      guideKey: "dashboard",
      icon: LayoutDashboard,
      badge: "Dashboard e onboarding",
      action: dashboardAction,
      group: "base",
      status: "ok",
      className: "border-violet-300/25 bg-violet-500/10",
    },
    {
      key: "flowchart",
      title: "Vista Diagramma",
      description:
        "Mostra un diagramma di flusso interattivo dei processi nella home del sito.",
      guideKey: "flowchart",
      icon: GitBranch,
      badge: flowchartEnabled ? "Attiva" : "Disattiva",
      action: flowchartAction,
      group: "operational",
      status: flowchartEnabled ? "ok" : "inactive",
      className: "border-teal-300/25 bg-teal-500/10",
    },
    {
      key: "commandDeck",
      title: "3D Desk View",
      description:
        "Mostra la navigazione immersiva Command Deck per questo spazio.",
      guideKey: "commandDeck",
      icon: Orbit,
      badge: commandDeckEnabled ? "Attiva" : "Disattiva",
      action: commandDeckAction,
      group: "operational",
      status: commandDeckEnabled ? "ok" : "inactive",
      className: "border-sky-300/25 bg-sky-500/10",
    },
    {
      key: "documentTemplate",
      title: "Carta intestata documenti",
      description:
        "Mittente, banca, IVA e condizioni predefinite per PDF e anteprima.",
      guideKey: "ai",
      icon: FileText,
      badge: "Branding PDF",
      action: documentTemplateAction,
      group: "base",
      status: "ok",
    },
    {
      key: "ai",
      title: "AI, API & voice",
      description: "Gestisci provider AI, chiavi API e istruzioni per i comandi vocali.",
      guideKey: "ai",
      icon: Bot,
      badge: summary?.ai?.hasApiKey
        ? `${summary?.ai?.provider || "Provider"} / ${summary?.ai?.speechProvider || "Voice"}`
        : "API key non configurata",
      action: aiAction,
      group: "operational",
      status: summary ? (summary.ai?.hasApiKey ? "ok" : "incomplete") : undefined,
    },
  ];

  const renderCard = (card: SettingsOverviewCard) => {
    const Icon = card.icon;
    const guide = SITE_SETTINGS_GUIDES[card.guideKey];

    return (
      <div
        key={card.key}
        id={`site-setting-card-${card.key}`}
        className={`scroll-mt-24 rounded-2xl border border-white/15 bg-white/5 p-5 ${
          card.className || ""
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/10 p-3 text-white/90">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-medium text-white">{card.title}</h3>
                <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-white/65">
                  {card.badge}
                </span>
                {card.status && (
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[card.status]}`}
                  >
                    {card.statusLabel || STATUS_DEFAULT_LABELS[card.status]}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-white/65">{card.description}</p>
            </div>
          </div>
          <SettingsHelpButton
            title={card.title}
            summary={guide.summary}
            details={guide.details}
          />
        </div>
        <div className="mt-4">
          {card.action}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {GROUP_ORDER.map((group) => {
        const groupCards = cards.filter((card) => card.group === group);
        if (groupCards.length === 0) return null;

        return (
          <div key={group} className="space-y-4">
            <div className="flex items-center gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
                {GROUP_LABELS[group]}
              </h4>
              <div className="h-px flex-1 bg-white/15" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {groupCards.map(renderCard)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
