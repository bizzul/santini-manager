"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  GripVertical,
  Move,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-solid-svg-icons";
import { getModuleFaIcon } from "@/lib/module-fa-icons";
import { getKanbanIcon } from "@/lib/kanban-icons";
import { KanbanColumnsChart } from "@/components/home/KanbanColumnsChart";
import type { WbsLeaf } from "@/lib/wbs-data";

export interface StandardModule {
  name: string;
  label: string;
  description: string;
  icon: string;
  href: string;
}

export interface StandardGroup {
  category: string;
  label: string;
  modules: StandardModule[];
}

interface StandardModulesViewProps {
  domain: string;
  groups: StandardGroup[];
  /** Level-3 content per module name (same data as the WBS diagram). */
  moduleItems?: Record<string, WbsLeaf[]>;
  /** Shows the "Registra Ore" quick action. */
  showTimetrackingAction: boolean;
}

/** Accent per category, aligned with the WBS diagram colors. */
const groupAccents: Record<string, string> = {
  core: "border-l-info",
  management: "border-l-primary",
  tools: "border-l-warning",
  reports: "border-l-success",
};

const iconAccents: Record<string, { text: string; bg: string }> = {
  core: { text: "text-info", bg: "bg-info/10" },
  management: { text: "text-primary", bg: "bg-primary/10" },
  tools: { text: "text-warning", bg: "bg-warning/10" },
  reports: { text: "text-success", bg: "bg-success/10" },
};

const groupOrderKey = (domain: string) => `fdm-home-group-order:${domain}`;
const moduleOrderKey = (domain: string) => `fdm-home-module-order:${domain}`;

/**
 * Standard home view: module cards grouped per category inside visual boxes.
 *
 * - "Modifica posizione": drag & drop both of whole group boxes and of the
 *   single module cards inside each group (order persisted in localStorage).
 * - Drill-down: clicking a module card with content shows the module's
 *   subcategories as cards (same data as the diagram leaves); from there the
 *   user can open the module page.
 */
export function StandardModulesView({
  domain,
  groups,
  moduleItems = {},
  showTimetrackingAction,
}: StandardModulesViewProps) {
  const router = useRouter();
  const basePath = `/sites/${domain}`;
  const defaultGroupOrder = useMemo(
    () => groups.map((group) => group.category),
    [groups]
  );

  const [groupOrder, setGroupOrder] = useState<string[]>(defaultGroupOrder);
  const [moduleOrder, setModuleOrder] = useState<Record<string, string[]>>({});
  const [editMode, setEditMode] = useState(false);
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null);
  const [dropTargetGroup, setDropTargetGroup] = useState<string | null>(null);
  const [draggedCard, setDraggedCard] = useState<
    { category: string; name: string } | null
  >(null);
  const [dropTargetCard, setDropTargetCard] = useState<string | null>(null);
  const [activeModuleName, setActiveModuleName] = useState<string | null>(
    null
  );

  // Restore the saved orders after mount (server-safe default first render).
  useEffect(() => {
    try {
      const storedGroups = window.localStorage.getItem(groupOrderKey(domain));
      if (storedGroups) {
        const saved: unknown = JSON.parse(storedGroups);
        if (Array.isArray(saved)) {
          const known = saved.filter((key): key is string =>
            defaultGroupOrder.includes(key as string)
          );
          const missing = defaultGroupOrder.filter(
            (key) => !known.includes(key)
          );
          setGroupOrder([...known, ...missing]);
        }
      }

      const storedModules = window.localStorage.getItem(
        moduleOrderKey(domain)
      );
      if (storedModules) {
        const saved: unknown = JSON.parse(storedModules);
        if (saved && typeof saved === "object" && !Array.isArray(saved)) {
          const clean: Record<string, string[]> = {};
          for (const [category, names] of Object.entries(saved)) {
            if (Array.isArray(names)) {
              clean[category] = names.filter(
                (name): name is string => typeof name === "string"
              );
            }
          }
          setModuleOrder(clean);
        }
      }
    } catch {
      // Ignore storage/parse errors and keep the default order.
    }
  }, [domain, defaultGroupOrder]);

  const persistGroupOrder = (next: string[]) => {
    setGroupOrder(next);
    try {
      window.localStorage.setItem(groupOrderKey(domain), JSON.stringify(next));
    } catch {
      // localStorage unavailable: keep in-memory order only.
    }
  };

  const persistModuleOrder = (next: Record<string, string[]>) => {
    setModuleOrder(next);
    try {
      window.localStorage.setItem(
        moduleOrderKey(domain),
        JSON.stringify(next)
      );
    } catch {
      // localStorage unavailable: keep in-memory order only.
    }
  };

  const moveGroup = (sourceKey: string, targetKey: string) => {
    if (sourceKey === targetKey) return;
    const next = groupOrder.filter((key) => key !== sourceKey);
    const targetIndex = next.indexOf(targetKey);
    next.splice(targetIndex, 0, sourceKey);
    persistGroupOrder(next);
  };

  const sortedModulesFor = (group: StandardGroup): StandardModule[] => {
    const saved = moduleOrder[group.category];
    if (!saved) return group.modules;
    const byName = new Map(
      group.modules.map((module) => [module.name, module])
    );
    const ordered = saved
      .map((name) => byName.get(name))
      .filter((module): module is StandardModule => Boolean(module));
    const missing = group.modules.filter(
      (module) => !saved.includes(module.name)
    );
    return [...ordered, ...missing];
  };

  const moveCard = (
    category: string,
    sourceName: string,
    targetName: string
  ) => {
    if (sourceName === targetName) return;
    const group = groups.find((entry) => entry.category === category);
    if (!group) return;

    const current = sortedModulesFor(group).map((module) => module.name);
    const next = current.filter((name) => name !== sourceName);
    const targetIndex = next.indexOf(targetName);
    next.splice(targetIndex, 0, sourceName);

    persistModuleOrder({ ...moduleOrder, [category]: next });
  };

  const sortedGroups = useMemo(
    () =>
      [...groups].sort(
        (a, b) =>
          groupOrder.indexOf(a.category) - groupOrder.indexOf(b.category)
      ),
    [groups, groupOrder]
  );

  const activeEntry = useMemo(() => {
    if (!activeModuleName) return null;
    for (const group of groups) {
      const module = group.modules.find(
        (entry) => entry.name === activeModuleName
      );
      if (module) return { module, category: group.category };
    }
    return null;
  }, [groups, activeModuleName]);

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Non hai ancora accesso a nessun modulo.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Contatta un amministratore per richiedere l&apos;accesso.
          </p>
        </CardContent>
      </Card>
    );
  }

  /* ------------------------- drill-down sub-view ------------------------- */

  if (activeEntry) {
    const { module, category } = activeEntry;
    const items = moduleItems[module.name] ?? [];
    const accent = iconAccents[category] ?? iconAccents.management;
    const moduleIcon = getModuleFaIcon(module.icon);
    const moduleHref = `${basePath}${module.href}`;
    const leafHref = (item: WbsLeaf) =>
      item.href ? `${basePath}${item.href}` : moduleHref;
    // Kanban-like modules carry per-column chart data on their leaves.
    const hasCharts = items.some((item) =>
      item.detail?.sections?.some(
        (section) => section.chart && section.chart.length > 0
      )
    );

    const header = (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveModuleName(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <div className="flex items-center gap-2">
            {moduleIcon && (
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  accent.bg
                )}
              >
                <FontAwesomeIcon
                  icon={moduleIcon}
                  className={cn("h-4 w-4", accent.text)}
                />
              </div>
            )}
            <h2 className="text-lg font-semibold">{module.label}</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {items.length}
            </span>
          </div>
        </div>

        <Button type="button" size="sm" asChild>
          <Link href={moduleHref}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Apri modulo
          </Link>
        </Button>
      </div>
    );

    if (items.length === 0) {
      return (
        <div className="space-y-6">
          {header}
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Nessuna sottocategoria disponibile per questo modulo.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Kanban: show the charts of each main category; the title links to the
    // board (the canva in the sidebar).
    if (hasCharts) {
      return (
        <div className="space-y-6">
          {header}
          <div className="space-y-6">
            {items.map((item) => {
              const LeafIcon = item.icon ? getKanbanIcon(item.icon) : null;
              const chartSections = (item.detail?.sections ?? []).filter(
                (section) => section.chart && section.chart.length > 0
              );

              return (
                <Card
                  key={item.id}
                  className="border-l-4"
                  style={
                    item.color ? { borderLeftColor: item.color } : undefined
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={leafHref(item)}
                        className="flex items-center gap-2 transition-colors hover:text-primary"
                      >
                        {LeafIcon && (
                          <LeafIcon
                            className="h-5 w-5"
                            style={item.color ? { color: item.color } : undefined}
                          />
                        )}
                        <CardTitle className="text-base">
                          {item.label}
                        </CardTitle>
                        {item.badge !== undefined && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                      <Button type="button" variant="outline" size="sm" asChild>
                        <Link href={leafHref(item)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Apri bacheca
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {chartSections.map((section, sectionIndex) => (
                      <div key={`${section.title}-${sectionIndex}`}>
                        <p className="mb-2 text-sm font-medium text-muted-foreground">
                          {section.title}
                        </p>
                        <KanbanColumnsChart data={section.chart!} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      );
    }

    // Other modules: subcategory cards link to the module (or deep link).
    return (
      <div className="space-y-6">
        {header}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const LeafIcon = item.icon ? getKanbanIcon(item.icon) : null;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => router.push(leafHref(item))}
                className="block text-left"
              >
                <Card
                  className="h-full border-l-4 transition-colors hover:bg-accent/50 cursor-pointer"
                  style={
                    item.color ? { borderLeftColor: item.color } : undefined
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          accent.bg
                        )}
                        style={
                          item.color
                            ? { backgroundColor: `${item.color}1f` }
                            : undefined
                        }
                      >
                        {LeafIcon ? (
                          <LeafIcon
                            className={cn("h-5 w-5", accent.text)}
                            style={item.color ? { color: item.color } : undefined}
                          />
                        ) : moduleIcon ? (
                          <FontAwesomeIcon
                            icon={moduleIcon}
                            className={cn("h-5 w-5", accent.text)}
                            style={item.color ? { color: item.color } : undefined}
                          />
                        ) : null}
                      </div>
                      <CardTitle className="text-base">{item.label}</CardTitle>
                    </div>
                  </CardHeader>
                  {item.badge !== undefined && (
                    <CardContent>
                      <CardDescription className="text-sm">
                        {item.badge} element{item.badge === "1" ? "o" : "i"}
                      </CardDescription>
                    </CardContent>
                  )}
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ------------------------------ main view ------------------------------ */

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Quick Actions */}
        {showTimetrackingAction ? (
          <Link
            href={`${basePath}/timetracking`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <FontAwesomeIcon icon={faClock} className="w-4 h-4" />
            Registra Ore
          </Link>
        ) : (
          <div />
        )}

        <Button
          type="button"
          variant={editMode ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setEditMode((current) => !current);
            setDraggedGroup(null);
            setDropTargetGroup(null);
            setDraggedCard(null);
            setDropTargetCard(null);
          }}
        >
          {editMode ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Fatto
            </>
          ) : (
            <>
              <Move className="h-4 w-4 mr-2" />
              Modifica posizione
            </>
          )}
        </Button>
      </div>

      {editMode && (
        <p className="text-xs text-muted-foreground">
          Trascina un riquadro (gruppo o singolo modulo) sopra un altro per
          spostarlo. La disposizione viene ricordata su questo dispositivo.
        </p>
      )}

      {sortedGroups.map((group) => {
        const accent = iconAccents[group.category] ?? iconAccents.management;
        const modules = sortedModulesFor(group);

        return (
          <section
            key={group.category}
            draggable={editMode}
            onDragStart={(event) => {
              if (!editMode || draggedCard) return;
              event.dataTransfer.effectAllowed = "move";
              setDraggedGroup(group.category);
            }}
            onDragEnd={() => {
              setDraggedGroup(null);
              setDropTargetGroup(null);
            }}
            onDragOver={(event) => {
              if (!editMode || !draggedGroup) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              if (group.category !== draggedGroup) {
                setDropTargetGroup(group.category);
              }
            }}
            onDragLeave={() => {
              if (dropTargetGroup === group.category) setDropTargetGroup(null);
            }}
            onDrop={(event) => {
              if (!editMode || !draggedGroup) return;
              event.preventDefault();
              moveGroup(draggedGroup, group.category);
              setDraggedGroup(null);
              setDropTargetGroup(null);
            }}
            aria-label={`Sezione ${group.label}`}
            className={cn(
              "rounded-xl border border-l-4 bg-card/40 p-4 transition-all sm:p-5",
              groupAccents[group.category] || "border-l-border",
              editMode && "cursor-grab select-none",
              draggedGroup === group.category && "opacity-50",
              dropTargetGroup === group.category && "ring-2 ring-primary/60"
            )}
          >
            <div className="mb-4 flex items-center gap-2">
              {editMode && (
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              )}
              <h2 className="text-lg font-semibold text-muted-foreground">
                {group.label}
              </h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {group.modules.length}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {modules.map((module) => {
                const icon = getModuleFaIcon(module.icon);
                const items = moduleItems[module.name] ?? [];
                const hasDrilldown = items.length > 0;
                const cardId = `${group.category}:${module.name}`;

                const card = (
                  <Card
                    className={cn(
                      "h-full transition-colors",
                      !editMode && "hover:bg-accent/50 cursor-pointer",
                      draggedCard?.name === module.name && "opacity-50",
                      dropTargetCard === cardId && "ring-2 ring-primary/60"
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        {editMode && (
                          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        {icon && (
                          <div
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-lg",
                              accent.bg
                            )}
                          >
                            <FontAwesomeIcon
                              icon={icon}
                              className={cn("h-5 w-5", accent.text)}
                            />
                          </div>
                        )}
                        <CardTitle className="text-base">
                          {module.label}
                        </CardTitle>
                        {hasDrilldown && (
                          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {items.length}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {module.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );

                const dragProps = editMode
                  ? {
                      draggable: true,
                      onDragStart: (event: React.DragEvent) => {
                        event.stopPropagation();
                        event.dataTransfer.effectAllowed = "move";
                        setDraggedCard({
                          category: group.category,
                          name: module.name,
                        });
                      },
                      onDragEnd: (event: React.DragEvent) => {
                        event.stopPropagation();
                        setDraggedCard(null);
                        setDropTargetCard(null);
                      },
                      onDragOver: (event: React.DragEvent) => {
                        if (
                          !draggedCard ||
                          draggedCard.category !== group.category
                        ) {
                          return;
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        event.dataTransfer.dropEffect = "move";
                        if (draggedCard.name !== module.name) {
                          setDropTargetCard(cardId);
                        }
                      },
                      onDragLeave: () => {
                        if (dropTargetCard === cardId) setDropTargetCard(null);
                      },
                      onDrop: (event: React.DragEvent) => {
                        if (
                          !draggedCard ||
                          draggedCard.category !== group.category
                        ) {
                          return;
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        moveCard(
                          group.category,
                          draggedCard.name,
                          module.name
                        );
                        setDraggedCard(null);
                        setDropTargetCard(null);
                      },
                    }
                  : {};

                if (editMode) {
                  return (
                    <div
                      key={module.name}
                      {...dragProps}
                      className="block cursor-grab"
                    >
                      {card}
                    </div>
                  );
                }

                if (hasDrilldown) {
                  return (
                    <button
                      key={module.name}
                      type="button"
                      onClick={() => setActiveModuleName(module.name)}
                      className="block text-left"
                    >
                      {card}
                    </button>
                  );
                }

                return (
                  <Link
                    key={module.name}
                    href={`${basePath}${module.href}`}
                    className="block"
                  >
                    {card}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
