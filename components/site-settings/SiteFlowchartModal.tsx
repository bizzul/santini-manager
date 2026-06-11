"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { ExternalLink, GitBranch, Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NodeStylePreview } from "@/components/site-settings/NodeStylePreview";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import {
  FLOWCHART_NODE_STYLE_LABELS,
  FLOWCHART_NODE_STYLES,
  FLOWCHART_ROOT_DESCRIPTIONS,
  FLOWCHART_ROOT_LABELS,
  FLOWCHART_ROOTS,
  FLOWCHART_SETTING_KEY,
  FLOWCHART_TYPE_LABELS,
  FLOWCHART_TYPES,
  FLOWCHART_TYPES_COMING_SOON,
  buildFlowchartPreviewUrl,
  getFlowchartSelectableModules,
  normalizeKanbanSelection,
  type FlowchartKanbanCategorySelection,
  type FlowchartNodeStyle,
  type FlowchartRoot,
  type FlowchartType,
  type SiteFlowchartSettings,
} from "@/lib/flowchart-settings";

interface KanbanCategoryOption {
  id: string;
  name: string;
}

interface KanbanBoardOption {
  id: string;
  title: string;
  categoryId: string | null;
}

function boardsForCategory(
  boards: KanbanBoardOption[],
  categoryId: string,
): KanbanBoardOption[] {
  return boards.filter((board) => (board.categoryId ?? "none") === categoryId);
}

function buildBoardsByCategory(
  categories: KanbanCategoryOption[],
  boards: KanbanBoardOption[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const category of categories) {
    map.set(
      category.id,
      boardsForCategory(boards, category.id).map((board) => board.id),
    );
  }
  return map;
}

function migrateLegacyKanbanIds(
  kanbanIds: string[] | null,
  categories: KanbanCategoryOption[],
  boards: KanbanBoardOption[],
): FlowchartKanbanCategorySelection[] | null {
  if (kanbanIds === null) return null;

  const boardsByCategory = buildBoardsByCategory(categories, boards);
  const selection: FlowchartKanbanCategorySelection[] = [];

  for (const category of categories) {
    const categoryBoards = boardsByCategory.get(category.id) ?? [];
    const selectedBoards = categoryBoards.filter((boardId) =>
      kanbanIds.includes(boardId),
    );
    if (selectedBoards.length === 0) continue;

    selection.push({
      categoryId: category.id,
      boardIds:
        selectedBoards.length === categoryBoards.length
          ? null
          : selectedBoards,
    });
  }

  return normalizeKanbanSelection(
    selection,
    categories.map((category) => category.id),
    boardsByCategory,
  );
}

const NODE_STYLE_DESCRIPTIONS: Record<FlowchartNodeStyle, string> = {
  hybrid:
    "Radice circolare, categorie e moduli rettangolari: il mix predefinito.",
  rect: "Tutti i nodi rettangolari, radice inclusa.",
  oval: "Nodi a pillola/ovali, con radice circolare.",
};

/** Modules that can be connected to the central node of the diagram. */
const SELECTABLE_MODULES = getFlowchartSelectableModules();
const ALL_MODULE_NAMES = SELECTABLE_MODULES.map((module) => module.name);

interface SiteFlowchartModalProps {
  siteId: string;
  siteName: string;
  siteSubdomain: string;
  trigger: React.ReactNode;
  initialSettings: SiteFlowchartSettings;
  /** Only superadmin is allowed to change these settings. */
  canConfigure: boolean;
}

/**
 * Admin modal to configure the "Vista Diagramma" (home diagram view) per site.
 *
 * Persistence: uses the generic `/api/settings/site-config` PUT endpoint
 * that upserts into `site_settings` (same mechanism as the Command Deck
 * toggle). No new API is introduced.
 *
 * The enable/disable toggle saves immediately; all other configuration
 * (type, node style, central category, modules and kanban boards) is edited
 * as a local draft and persisted only with the "Salva" button.
 */
export function SiteFlowchartModal({
  siteId,
  siteName,
  siteSubdomain,
  trigger,
  initialSettings,
  canConfigure,
}: SiteFlowchartModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [savedSettings, setSavedSettings] = useState<SiteFlowchartSettings>(
    initialSettings,
  );
  const [draft, setDraft] = useState<SiteFlowchartSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [togglePending, setTogglePending] = useState(false);
  const [boards, setBoards] = useState<KanbanBoardOption[]>([]);
  const [categories, setCategories] = useState<KanbanCategoryOption[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const previewUrl = useMemo(
    () => buildFlowchartPreviewUrl(siteSubdomain, draft),
    [siteSubdomain, draft],
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const loadKanbanData = async () => {
      setBoardsLoading(true);
      try {
        const [boardsResponse, categoriesResponse] = await Promise.all([
          fetch(`/api/kanban/list?domain=${siteSubdomain}`),
          fetch(`/api/kanban/categories?domain=${siteSubdomain}`),
        ]);
        const [boardsResult, categoriesResult] = await Promise.all([
          boardsResponse.json(),
          categoriesResponse.json(),
        ]);

        if (cancelled) return;

        if (boardsResponse.ok && Array.isArray(boardsResult)) {
          setBoards(
            boardsResult.map(
              (board: {
                id: string | number;
                title?: string;
                category_id?: number | null;
                category?: { id?: number | null } | { id?: number | null }[] | null;
              }) => {
                const category = Array.isArray(board.category)
                  ? board.category[0] ?? null
                  : board.category;
                const categoryId =
                  board.category_id != null
                    ? String(board.category_id)
                    : category?.id != null
                      ? String(category.id)
                      : null;

                return {
                  id: String(board.id),
                  title: board.title || "Kanban",
                  categoryId,
                };
              },
            ),
          );
        }

        if (categoriesResponse.ok && Array.isArray(categoriesResult)) {
          setCategories(
            categoriesResult.map(
              (category: { id: string | number; name?: string }) => ({
                id: String(category.id),
                name: category.name || "Categoria",
              }),
            ),
          );
        }
      } catch (error) {
        logger.error("Flowchart kanban data load error:", error);
      } finally {
        if (!cancelled) setBoardsLoading(false);
      }
    };

    loadKanbanData();
    return () => {
      cancelled = true;
    };
  }, [open, siteSubdomain]);

  const boardsByCategory = useMemo(
    () => buildBoardsByCategory(categories, boards),
    [categories, boards],
  );
  const allCategoryIds = useMemo(
    () => categories.map((category) => category.id),
    [categories],
  );

  // Migrate legacy flat kanbanIds into the hierarchical selection once data loads.
  useEffect(() => {
    if (!open || boardsLoading || categories.length === 0) return;
    if (draft.kanbanSelection !== null || !draft.kanbanIds) return;

    const migrated = migrateLegacyKanbanIds(
      draft.kanbanIds,
      categories,
      boards,
    );
    setDraft((current) => ({
      ...current,
      kanbanSelection: migrated,
      kanbanIds: null,
    }));
  }, [
    open,
    boardsLoading,
    categories,
    boards,
    draft.kanbanIds,
    draft.kanbanSelection,
  ]);

  const selectedModules = useMemo(
    () => draft.modules ?? ALL_MODULE_NAMES,
    [draft.modules],
  );

  const effectiveKanbanSelection = draft.kanbanSelection;

  const isKanbanCategorySelected = (categoryId: string) => {
    if (effectiveKanbanSelection === null) return true;
    return effectiveKanbanSelection.some(
      (entry) => entry.categoryId === categoryId,
    );
  };

  const getSelectedBoardIdsForCategory = (categoryId: string) => {
    const categoryBoards = boardsByCategory.get(categoryId) ?? [];
    if (effectiveKanbanSelection === null) return categoryBoards;
    const entry = effectiveKanbanSelection.find(
      (item) => item.categoryId === categoryId,
    );
    if (!entry) return [];
    return entry.boardIds ?? categoryBoards;
  };

  const areAllBoardsSelectedInCategory = (categoryId: string) => {
    const categoryBoards = boardsByCategory.get(categoryId) ?? [];
    if (categoryBoards.length === 0) return true;
    const selected = getSelectedBoardIdsForCategory(categoryId);
    return selected.length === categoryBoards.length;
  };

  const allKanbanCategoriesSelected =
    effectiveKanbanSelection === null ||
    (effectiveKanbanSelection.length === allCategoryIds.length &&
      allCategoryIds.every((categoryId) =>
        isKanbanCategorySelected(categoryId),
      ));

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedSettings),
    [draft, savedSettings],
  );

  const writeSettings = async (next: SiteFlowchartSettings) => {
    const response = await fetch("/api/settings/site-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId,
        settingKey: FLOWCHART_SETTING_KEY,
        value: next,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(
        result.error || "Impossibile aggiornare la Vista Diagramma",
      );
    }
  };

  const handleToggle = async () => {
    if (!canConfigure) {
      toast.error("Solo utenti superadmin possono modificare questa opzione.");
      return;
    }

    const next: SiteFlowchartSettings = {
      ...savedSettings,
      enabled: !savedSettings.enabled,
    };
    setTogglePending(true);
    try {
      await writeSettings(next);
      setSavedSettings(next);
      // Keep any in-progress draft edits, only sync the enabled flag.
      setDraft((current) => ({ ...current, enabled: next.enabled }));
      toast.success(
        next.enabled
          ? "Vista diagramma abilitata nella home di questo spazio."
          : "Vista diagramma disabilitata per questo spazio.",
      );
    } catch (error) {
      logger.error("Flowchart toggle error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore durante l'aggiornamento dell'impostazione",
      );
    } finally {
      setTogglePending(false);
    }
  };

  const handleSave = async () => {
    if (!canConfigure) {
      toast.error("Solo utenti superadmin possono modificare questa opzione.");
      return;
    }

    setSaving(true);
    try {
      const payload: SiteFlowchartSettings = {
        ...draft,
        kanbanIds: null,
      };
      await writeSettings(payload);
      setSavedSettings(payload);
      setDraft(payload);
      router.refresh();
      toast.success("Configurazione vista diagramma salvata.");
    } catch (error) {
      logger.error("Flowchart settings save error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore durante il salvataggio della configurazione",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTypeChange = (value: string) => {
    if (!FLOWCHART_TYPES.includes(value as FlowchartType)) return;
    setDraft((current) => ({ ...current, type: value as FlowchartType }));
  };

  const handleRootChange = (value: string) => {
    if (!FLOWCHART_ROOTS.includes(value as FlowchartRoot)) return;
    setDraft((current) => ({ ...current, root: value as FlowchartRoot }));
  };

  const handleModuleToggle = (moduleName: string) => {
    const isSelected = selectedModules.includes(moduleName);
    const next = isSelected
      ? selectedModules.filter((name) => name !== moduleName)
      : [...selectedModules, moduleName];
    // `null` means "all modules" and auto-includes future ones.
    const normalized = next.length === ALL_MODULE_NAMES.length ? null : next;
    setDraft((current) => ({ ...current, modules: normalized }));
  };

  const handleAllModulesToggle = () => {
    const allSelected = selectedModules.length === ALL_MODULE_NAMES.length;
    setDraft((current) => ({ ...current, modules: allSelected ? [] : null }));
  };

  const handleAllKanbanCategoriesToggle = () => {
    setDraft((current) => ({
      ...current,
      kanbanSelection: allKanbanCategoriesSelected ? [] : null,
      kanbanIds: null,
    }));
  };

  const handleKanbanCategoryToggle = (categoryId: string) => {
    setDraft((current) => {
      let selection =
        current.kanbanSelection ??
        allCategoryIds.map((id) => ({ categoryId: id, boardIds: null }));

      if (current.kanbanSelection === null) {
        selection = allCategoryIds
          .filter((id) => id !== categoryId)
          .map((id) => ({ categoryId: id, boardIds: null }));
      } else if (selection.some((entry) => entry.categoryId === categoryId)) {
        selection = selection.filter((entry) => entry.categoryId !== categoryId);
      } else {
        selection = [...selection, { categoryId, boardIds: null }];
      }

      return {
        ...current,
        kanbanSelection: normalizeKanbanSelection(
          selection,
          allCategoryIds,
          boardsByCategory,
        ),
        kanbanIds: null,
      };
    });
  };

  const handleKanbanCategoryAllBoardsToggle = (categoryId: string) => {
    setDraft((current) => {
      let selection =
        current.kanbanSelection ??
        allCategoryIds.map((id) => ({ categoryId: id, boardIds: null }));

      const categoryBoards = boardsByCategory.get(categoryId) ?? [];
      const entry = selection.find((item) => item.categoryId === categoryId);
      const allSelected =
        entry?.boardIds === null || areAllBoardsSelectedInCategory(categoryId);

      if (allSelected) {
        selection = selection.filter((item) => item.categoryId !== categoryId);
      } else if (entry) {
        selection = selection.map((item) =>
          item.categoryId === categoryId ? { ...item, boardIds: null } : item,
        );
      } else {
        selection = [...selection, { categoryId, boardIds: null }];
      }

      return {
        ...current,
        kanbanSelection: normalizeKanbanSelection(
          selection,
          allCategoryIds,
          boardsByCategory,
        ),
        kanbanIds: null,
      };
    });
  };

  const handleKanbanBoardToggle = (categoryId: string, boardId: string) => {
    setDraft((current) => {
      let selection =
        current.kanbanSelection ??
        allCategoryIds.map((id) => ({ categoryId: id, boardIds: null }));

      const categoryBoards = boardsByCategory.get(categoryId) ?? [];
      const entry = selection.find((item) => item.categoryId === categoryId);
      const currentBoardIds = entry?.boardIds ?? categoryBoards;
      const isSelected = currentBoardIds.includes(boardId);
      const nextBoardIds = isSelected
        ? currentBoardIds.filter((id) => id !== boardId)
        : [...currentBoardIds, boardId];

      if (nextBoardIds.length === 0) {
        selection = selection.filter((item) => item.categoryId !== categoryId);
      } else if (nextBoardIds.length === categoryBoards.length) {
        if (entry) {
          selection = selection.map((item) =>
            item.categoryId === categoryId ? { ...item, boardIds: null } : item,
          );
        } else {
          selection = [...selection, { categoryId, boardIds: null }];
        }
      } else if (entry) {
        selection = selection.map((item) =>
          item.categoryId === categoryId
            ? { ...item, boardIds: nextBoardIds }
            : item,
        );
      } else {
        selection = [...selection, { categoryId, boardIds: nextBoardIds }];
      }

      return {
        ...current,
        kanbanSelection: normalizeKanbanSelection(
          selection,
          allCategoryIds,
          boardsByCategory,
        ),
        kanbanIds: null,
      };
    });
  };

  const handleNodeStyleSelect = (style: FlowchartNodeStyle) => {
    if (!canConfigure || saving) return;
    setDraft((current) => ({ ...current, nodeStyle: style }));
  };

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-teal-300" />
            Vista Diagramma
          </DialogTitle>
          <DialogDescription>
            Mostra la home dello spazio{" "}
            <span className="font-semibold text-white/90">{siteName}</span> in
            modalità diagramma interattivo a schermo intero.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-teal-300/25 bg-teal-500/10 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">
                Abilita vista diagramma in home
              </p>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    savedSettings.enabled
                      ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
                      : "border-slate-400/40 bg-slate-500/20 text-slate-100"
                  }
                >
                  {savedSettings.enabled ? "Attiva" : "Disattiva"}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleToggle}
                  disabled={!canConfigure || togglePending}
                  className={
                    savedSettings.enabled
                      ? "bg-red-500/80 text-white hover:bg-red-500"
                      : "bg-teal-500 text-teal-950 hover:bg-teal-400"
                  }
                >
                  {togglePending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : savedSettings.enabled ? (
                    "Disabilita"
                  ) : (
                    "Abilita"
                  )}
                </Button>
              </div>
            </div>

            {!canConfigure && (
              <p className="mt-2 text-[11px] italic text-white/55">
                Solo utenti superadmin possono modificare questa opzione.
              </p>
            )}
          </div>

          {savedSettings.enabled && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-white/80">
                  Tipo di diagramma
                </p>
                <Select
                  value={draft.type}
                  onValueChange={handleTypeChange}
                  disabled={!canConfigure || saving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FLOWCHART_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {FLOWCHART_TYPE_LABELS[type]}
                        {FLOWCHART_TYPES_COMING_SOON.includes(type)
                          ? " (In arrivo)"
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {FLOWCHART_TYPES_COMING_SOON.includes(draft.type) && (
                <p className="text-[11px] italic text-amber-200/80">
                  Questo diagramma è in fase di sviluppo: nella home verrà
                  mostrato un avviso &quot;In arrivo&quot;.
                </p>
              )}

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-white/80">
                  Modello grafico
                </p>
                <TooltipProvider delayDuration={150}>
                  <div className="grid grid-cols-3 gap-2">
                    {FLOWCHART_NODE_STYLES.map((style) => {
                      const selected = draft.nodeStyle === style;
                      return (
                        <Tooltip key={style}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => handleNodeStyleSelect(style)}
                              disabled={!canConfigure || saving}
                              aria-pressed={selected}
                              className={cn(
                                "flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors",
                                selected
                                  ? "border-teal-300/60 bg-teal-500/10"
                                  : "border-white/15 bg-white/5 hover:bg-white/10"
                              )}
                            >
                              <NodeStylePreview
                                style={style}
                                className="h-12 w-full"
                              />
                              <span
                                className={cn(
                                  "text-[11px] font-medium",
                                  selected ? "text-teal-100" : "text-white/70"
                                )}
                              >
                                {FLOWCHART_NODE_STYLE_LABELS[style]}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="w-56 border-white/15 bg-slate-900 p-3"
                          >
                            <NodeStylePreview
                              style={style}
                              className="h-24 w-full"
                            />
                            <p className="mt-2 text-center text-[11px] text-white/75">
                              {NODE_STYLE_DESCRIPTIONS[style]}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </TooltipProvider>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-white/80">
                  Categoria centrale
                </p>
                <Select
                  value={draft.root}
                  onValueChange={handleRootChange}
                  disabled={!canConfigure || saving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FLOWCHART_ROOTS.map((root) => (
                      <SelectItem key={root} value={root}>
                        {FLOWCHART_ROOT_LABELS[root]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-white/55">
                  {FLOWCHART_ROOT_DESCRIPTIONS[draft.root]}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-white/80">
                      Moduli collegati al nodo centrale
                    </p>
                    <p className="text-[11px] text-white/55">
                      Seleziona quali aree mostrare e collegare nel diagramma.
                    </p>
                  </div>
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-white/70">
                    <Checkbox
                      checked={
                        selectedModules.length === ALL_MODULE_NAMES.length
                      }
                      onCheckedChange={handleAllModulesToggle}
                      disabled={!canConfigure || saving}
                      className="border-white/40"
                    />
                    Tutti
                  </label>
                </div>

                <div className="max-h-[240px] space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-2 pr-1">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {SELECTABLE_MODULES.map((module) => (
                      <label
                        key={module.name}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs text-white/80 transition-colors hover:bg-white/10"
                      >
                        <Checkbox
                          checked={selectedModules.includes(module.name)}
                          onCheckedChange={() =>
                            handleModuleToggle(module.name)
                          }
                          disabled={!canConfigure || saving}
                          className="border-white/40"
                        />
                        {module.label}
                      </label>
                    ))}
                  </div>

                  {selectedModules.includes("kanban") && (
                    <div className="mt-2 space-y-2 rounded-md border border-white/10 bg-white/5 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-medium text-white/70">
                            Categorie Kanban da collegare
                          </p>
                          <p className="text-[10px] text-white/45">
                            Seleziona le categorie principali, poi le singole
                            bacheche sotto ciascuna categoria.
                          </p>
                        </div>
                        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-white/70">
                          <Checkbox
                            checked={allKanbanCategoriesSelected}
                            onCheckedChange={handleAllKanbanCategoriesToggle}
                            disabled={
                              !canConfigure ||
                              saving ||
                              categories.length === 0
                            }
                            className="border-white/40"
                          />
                          Tutte
                        </label>
                      </div>

                      {boardsLoading ? (
                        <p className="flex items-center gap-2 text-[11px] text-white/50">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Caricamento categorie kanban...
                        </p>
                      ) : categories.length === 0 ? (
                        <p className="text-[11px] italic text-white/50">
                          Nessuna categoria kanban presente nel sito.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {categories.map((category) => {
                            const categorySelected = isKanbanCategorySelected(
                              category.id,
                            );
                            const categoryBoards = boardsForCategory(
                              boards,
                              category.id,
                            );
                            const selectedBoardIds =
                              getSelectedBoardIdsForCategory(category.id);
                            const allBoardsSelected =
                              areAllBoardsSelectedInCategory(category.id);

                            return (
                              <div
                                key={category.id}
                                className={cn(
                                  "rounded-md border border-white/10 bg-white/5 p-2",
                                  categorySelected && "border-teal-300/25",
                                )}
                              >
                                <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-xs font-medium text-white/85 transition-colors hover:bg-white/10">
                                  <Checkbox
                                    checked={categorySelected}
                                    onCheckedChange={() =>
                                      handleKanbanCategoryToggle(category.id)
                                    }
                                    disabled={!canConfigure || saving}
                                    className="border-white/40"
                                  />
                                  {category.name}
                                </label>

                                {categorySelected && categoryBoards.length > 0 && (
                                  <div className="mt-2 space-y-1 border-l border-white/10 pl-3">
                                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-[11px] text-white/70 transition-colors hover:bg-white/10">
                                      <Checkbox
                                        checked={allBoardsSelected}
                                        onCheckedChange={() =>
                                          handleKanbanCategoryAllBoardsToggle(
                                            category.id,
                                          )
                                        }
                                        disabled={!canConfigure || saving}
                                        className="border-white/40"
                                      />
                                      Tutte le bacheche
                                    </label>
                                    <div className="grid grid-cols-1 gap-y-1 sm:grid-cols-2">
                                      {categoryBoards.map((board) => (
                                        <label
                                          key={board.id}
                                          className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-[11px] text-white/75 transition-colors hover:bg-white/10"
                                        >
                                          <Checkbox
                                            checked={selectedBoardIds.includes(
                                              board.id,
                                            )}
                                            onCheckedChange={() =>
                                              handleKanbanBoardToggle(
                                                category.id,
                                                board.id,
                                              )
                                            }
                                            disabled={!canConfigure || saving}
                                            className="border-white/40"
                                          />
                                          {board.title}
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {categorySelected &&
                                  categoryBoards.length === 0 && (
                                    <p className="mt-1 pl-6 text-[10px] italic text-white/45">
                                      Nessuna bacheca in questa categoria.
                                    </p>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-white/30 text-white hover:bg-white/10"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Anteprima diagramma
                  </Button>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-white/55 underline-offset-2 hover:text-white/80 hover:underline"
                  >
                    Apri in nuova scheda
                  </a>
                </div>

                <div className="flex items-center gap-3">
                  {isDirty && (
                    <span className="text-[11px] italic text-amber-200/80">
                      Modifiche non salvate
                    </span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSave}
                    disabled={!canConfigure || saving || !isDirty}
                    className="bg-teal-500 text-teal-950 hover:bg-teal-400"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salva
                  </Button>
                </div>
              </div>

              {isDirty && (
                <p className="text-[11px] text-white/45">
                  Salva per applicare le modifiche anche nella home del sito.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Temporary in-app preview window (reliable in every browser, no popup
        blocker involved). The iframe forces the diagram view without touching
        the user's saved home preference. */}
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="flex h-[85vh] max-w-[90vw] flex-col gap-3 sm:max-w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-teal-300" />
            Anteprima diagramma — {siteName}
          </DialogTitle>
          <DialogDescription>
            Anteprima con le impostazioni correnti del pannello (incluse le
            modifiche non ancora salvate).
          </DialogDescription>
        </DialogHeader>
        {previewOpen && (
          <iframe
            key={previewUrl}
            src={previewUrl}
            title={`Anteprima diagramma ${siteName}`}
            className="min-h-0 w-full flex-1 rounded-lg border border-white/15 bg-white/5"
          />
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}

export default SiteFlowchartModal;
