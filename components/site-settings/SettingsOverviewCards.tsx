"use client";

import {
  Bot,
  Box,
  Factory,
  Headset,
  Layers,
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

interface SettingsOverviewCard {
  key: string;
  title: string;
  description: string;
  guideKey: SiteSettingsGuideKey;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  action: React.ReactNode;
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
  themeAction: React.ReactNode;
  supportAction: React.ReactNode;
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
  themeAction,
  supportAction,
}: SettingsOverviewCardsProps) {
  const cards: SettingsOverviewCard[] = [
    {
      key: "modules",
      title: "Moduli",
      description: "Decidi quali aree del gestionale sono disponibili per questo spazio.",
      guideKey: "modules",
      icon: Settings,
      badge: `${summary?.modules?.active ?? 0}/${summary?.modules?.total ?? 0} attivi`,
      action: moduleAction,
    },
    {
      key: "codes",
      title: "Codici",
      description: "Imposta formato dei codici e regole per il flusso offerte.",
      guideKey: "codes",
      icon: Box,
      badge: "Template e regole",
      action: codesAction,
    },
    {
      key: "products",
      title: "Prodotti",
      description: "Configura categorie prodotto, immagine, colore e fornitori suggeriti.",
      guideKey: "products",
      icon: Package,
      badge: `${summary?.products?.categories ?? 0} categorie, ${summary?.products?.items ?? 0} prodotti`,
      action: productsAction,
    },
    {
      key: "kanban",
      title: "Kanban",
      description: "Organizza le bacheche in categorie chiare per area di lavoro.",
      guideKey: "kanban",
      icon: Layers,
      badge: `${summary?.kanban?.boards ?? 0} kanban, ${summary?.kanban?.columns ?? 0} colonne`,
      action: kanbanAction,
    },
    {
      key: "factory",
      title: "Fabbrica",
      description: "Definisci reparti, macchinari e costo orario di produzione.",
      guideKey: "factory",
      icon: Factory,
      badge: `${summary?.factory?.departments ?? 0} reparti, ${summary?.factory?.machines ?? 0} macchinari`,
      action: factoryAction,
    },
    {
      key: "inventory",
      title: "Inventario",
      description: "Raggruppa il magazzino in categorie facili da cercare e filtrare.",
      guideKey: "inventory",
      icon: Box,
      badge: `${summary?.inventory?.categories ?? 0} categorie, ${summary?.inventory?.items ?? 0} articoli`,
      action: inventoryAction,
    },
    {
      key: "hr",
      title: "HR",
      description: "Controlla utenti attivi, costo orario e accessi ai moduli.",
      guideKey: "hr",
      icon: Users,
      badge: `${summary?.users?.total ?? 0} utenti, ${summary?.hr?.configuredRates ?? 0} costi definiti`,
      action: hrAction,
    },
    {
      key: "theme",
      title: "Colori & modalita",
      description: "Definisci palette e modalita light/dark/adaptive per il sito.",
      guideKey: "theme",
      icon: Palette,
      badge: "Tema e contrasti",
      action: themeAction,
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
      className: "border-emerald-300/25 bg-emerald-500/10",
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
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => {
        const Icon = card.icon;
        const guide = SITE_SETTINGS_GUIDES[card.guideKey];

        return (
          <div
            key={card.key}
            className={`rounded-2xl border border-white/15 bg-white/5 p-5 ${
              card.className || ""
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-white/10 p-3 text-white/90">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium text-white">{card.title}</h3>
                    <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-white/65">
                      {card.badge}
                    </span>
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
      })}
    </div>
  );
}
