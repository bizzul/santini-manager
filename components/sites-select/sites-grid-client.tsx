"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ACTIVE_WORKSPACE_KEYS,
  CUSTOM_DEMO_KEYS,
} from "@/lib/site-settings-guides";

type SiteGroupKey = "active" | "custom" | "beta" | "alpha";

type Site = {
  id: string | number;
  name: string;
  subdomain?: string | null;
  description?: string | null;
  logo?: string | null;
  image?: string | null;
  [key: string]: unknown;
};

type GroupedSites = Record<SiteGroupKey, Site[]>;

type SiteGroupDefinition = {
  key: SiteGroupKey;
  title: string;
  description: string;
};

const ALPHA_KEYS = ["alpha", "alfa"] as const;
const BETA_KEYS = ["beta", "template", "demo"] as const;

const SITE_GROUP_DEFINITIONS: SiteGroupDefinition[] = [
  {
    key: "active",
    title: "Utenti attivi",
    description: "Spazi operativi principali con accesso diretto.",
  },
  {
    key: "custom",
    title: "Utenti custom",
    description: "Spazi personalizzati per clienti e casi specifici.",
  },
  {
    key: "beta",
    title: "Demo beta",
    description: "Ambienti demo pronti per test e presentazioni.",
  },
  {
    key: "alpha",
    title: "Demo alpha",
    description: "Ambienti sperimentali in fase iniziale.",
  },
];

const normalizeSiteKey = (value?: string | null) =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const isSiteGroupKey = (value: unknown): value is SiteGroupKey =>
  value === "active" || value === "custom" || value === "beta" || value === "alpha";

function resolveSiteGroup(site: Site): SiteGroupKey {
  const normalizedValues = [
    normalizeSiteKey(site.subdomain),
    normalizeSiteKey(site.name),
  ];

  if (
    normalizedValues.some((value) =>
      ACTIVE_WORKSPACE_KEYS.some((key) => value.includes(key))
    )
  ) {
    return "active";
  }

  if (
    normalizedValues.some((value) =>
      CUSTOM_DEMO_KEYS.some((key) => value.includes(key))
    )
  ) {
    return "custom";
  }

  if (
    normalizedValues.some((value) =>
      ALPHA_KEYS.some((key) => value.includes(key))
    )
  ) {
    return "alpha";
  }

  if (
    normalizedValues.some((value) =>
      BETA_KEYS.some((key) => value.includes(key))
    )
  ) {
    return "beta";
  }

  return "beta";
}

const createEmptyGroupedSites = (): GroupedSites => ({
  active: [],
  custom: [],
  beta: [],
  alpha: [],
});

const buildInitialGroups = (
  sites: Site[],
  overrides?: Record<string, SiteGroupKey>
): GroupedSites => {
  const grouped = createEmptyGroupedSites();

  sites.forEach((site) => {
    const siteId = String(site.id);
    const storedGroup = overrides?.[siteId];
    const groupKey = isSiteGroupKey(storedGroup) ? storedGroup : resolveSiteGroup(site);
    grouped[groupKey].push(site);
  });

  return grouped;
};

function SiteCard({
  site,
  isDragging,
  canDrag,
  onDragStart,
  onDragEnd,
}: {
  site: Site;
  isDragging: boolean;
  canDrag: boolean;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, siteId: string) => void;
  onDragEnd: () => void;
}) {
  const visual = site.logo || site.image;

  return (
    <div
      draggable={canDrag}
      onDragStart={
        canDrag ? (event) => onDragStart(event, String(site.id)) : undefined
      }
      onDragEnd={canDrag ? onDragEnd : undefined}
      className={`group rounded-2xl border border-white/20 bg-white/8 p-5 transition-all duration-200 hover:border-white/40 hover:bg-white/12 ${
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      } ${
        isDragging ? "opacity-60" : "opacity-100"
      }`}
    >
      <div className="flex items-start gap-3">
        {visual ? (
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10">
            <img
              src={String(visual)}
              alt={site.name}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <Building2 className="h-6 w-6 text-white" strokeWidth={2} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-white">{site.name}</h3>
          {site.subdomain && <p className="text-sm text-white/55">{site.subdomain}</p>}
        </div>
      </div>

      <p className="mt-4 min-h-[40px] text-sm text-white/70">
        {site.description || "Spazio disponibile per accesso e gestione operativa."}
      </p>

      <Link href={`/sites/${site.subdomain}/dashboard`} className="mt-4 block">
        <Button
          variant="outline"
          className="w-full border-white/25 text-white hover:bg-white/10 hover:border-white/40"
        >
          Entra nel tuo spazio
        </Button>
      </Link>
    </div>
  );
}

export function SitesGridClient({
  sites,
  initialOverrides = {},
  canManageGroups = false,
}: {
  sites: Site[];
  initialOverrides?: Record<string, SiteGroupKey>;
  canManageGroups?: boolean;
}) {
  const [groupedSites, setGroupedSites] = useState<GroupedSites>(() =>
    buildInitialGroups(sites, initialOverrides)
  );
  const [draggedSiteId, setDraggedSiteId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<SiteGroupKey | null>(null);
  const [savingSiteId, setSavingSiteId] = useState<string | null>(null);

  useEffect(() => {
    setGroupedSites(buildInitialGroups(sites, initialOverrides));
  }, [sites, initialOverrides]);

  const computeMovedGroups = (
    current: GroupedSites,
    siteId: string,
    targetGroup: SiteGroupKey
  ) => {
    const next: GroupedSites = {
      active: [...current.active],
      custom: [...current.custom],
      beta: [...current.beta],
      alpha: [...current.alpha],
    };

    let sourceGroup: SiteGroupKey | null = null;
    let movedSite: Site | null = null;

    for (const group of SITE_GROUP_DEFINITIONS) {
      const siteIndex = next[group.key].findIndex(
        (site) => String(site.id) === siteId
      );
      if (siteIndex !== -1) {
        sourceGroup = group.key;
        const [site] = next[group.key].splice(siteIndex, 1);
        movedSite = site;
        break;
      }
    }

    if (!sourceGroup || !movedSite || sourceGroup === targetGroup) {
      return { changed: false as const, next: current };
    }

    next[targetGroup].push(movedSite);
    return { changed: true as const, next };
  };

  const persistSiteGroupPreference = async (
    siteId: string,
    groupKey: SiteGroupKey
  ) => {
    const response = await fetch("/api/sites/select/group-preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ siteId, groupKey }),
    });

    if (!response.ok) {
      throw new Error("Failed to persist site group preference");
    }
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    siteId: string
  ) => {
    if (!canManageGroups) {
      return;
    }
    event.dataTransfer.setData("text/plain", siteId);
    event.dataTransfer.effectAllowed = "move";
    setDraggedSiteId(siteId);
  };

  const handleDrop = async (
    event: React.DragEvent<HTMLElement>,
    targetGroup: SiteGroupKey
  ) => {
    if (!canManageGroups) {
      return;
    }
    event.preventDefault();
    const siteIdFromData = event.dataTransfer.getData("text/plain");
    const siteId = siteIdFromData || draggedSiteId;

    if (siteId) {
      const current = groupedSites;
      const { changed, next } = computeMovedGroups(current, siteId, targetGroup);
      if (changed) {
        setGroupedSites(next);
        setSavingSiteId(siteId);
        try {
          await persistSiteGroupPreference(siteId, targetGroup);
        } catch (error) {
          console.error(error);
          setGroupedSites(current);
        } finally {
          setSavingSiteId(null);
        }
      }
    }

    setDraggedSiteId(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedSiteId(null);
    setDropTarget(null);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-4">
      {SITE_GROUP_DEFINITIONS.map((group) => (
        <section
          key={group.key}
          onDragOver={(event) => {
            if (!canManageGroups) {
              return;
            }
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDropTarget(group.key);
          }}
          onDragLeave={() => {
            if (!canManageGroups) {
              return;
            }
            if (dropTarget === group.key) {
              setDropTarget(null);
            }
          }}
          onDrop={canManageGroups ? (event) => handleDrop(event, group.key) : undefined}
          className={`rounded-3xl border bg-white/5 p-4 backdrop-blur-xl transition-colors ${
            canManageGroups && dropTarget === group.key
              ? "border-blue-400/70 ring-2 ring-blue-400/30"
              : "border-white/15"
          }`}
        >
          <div className="mb-4 border-b border-white/10 pb-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">{group.title}</h2>
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/60">
                {groupedSites[group.key].length}
              </span>
            </div>
            <p className="mt-2 text-sm text-white/55">{group.description}</p>
          </div>

          <div className="space-y-4">
            {groupedSites[group.key].length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/45">
                {canManageGroups
                  ? "Trascina qui uno spazio."
                  : "Nessuno spazio in questa sezione."}
              </div>
            ) : (
              groupedSites[group.key].map((site) => (
                <SiteCard
                  key={site.id}
                  site={site}
                  canDrag={canManageGroups}
                  isDragging={
                    draggedSiteId === String(site.id) ||
                    savingSiteId === String(site.id)
                  }
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
