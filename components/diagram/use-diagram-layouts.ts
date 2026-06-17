"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NodeChange } from "@xyflow/react";
import { useToast } from "@/hooks/use-toast";
import {
  createLayoutId,
  parseDiagramLayouts,
  type DiagramKey,
  type DiagramLayout,
  type DiagramLayoutsSetting,
  type DiagramNodePosition,
} from "@/lib/diagram-layouts";

type PositionMap = Record<string, DiagramNodePosition>;

interface UseDiagramLayoutsArgs {
  siteId?: string;
  diagramKey: DiagramKey | string;
  initial?: DiagramLayoutsSetting;
}

interface MinimalNode {
  id: string;
  position: DiagramNodePosition;
}

/**
 * Shared edit-mode + saved-layouts controller for React Flow diagrams.
 *
 * - Tracks `editMode` and per-node `positionOverrides`.
 * - `onNodesChange` moves a dragged node together with all of its descendants
 *   (cascade), mirroring the WBS behavior.
 * - Manages named layout presets persisted per-site via `/api/diagram-layouts`.
 *
 * The consumer must keep `positionsRef.current` updated each render with the
 * full position map of all rendered nodes so saves capture a complete layout.
 */
export function useDiagramLayouts({
  siteId,
  diagramKey,
  initial,
}: UseDiagramLayoutsArgs) {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [positionOverrides, setPositionOverrides] = useState<PositionMap>({});
  const [layouts, setLayouts] = useState<DiagramLayout[]>(
    initial?.layouts ?? [],
  );
  const [activeId, setActiveId] = useState<string | null>(
    initial?.activeId ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);

  // Full positions of every rendered node (computed + overrides), maintained
  // by the consumer; saves read from here.
  const positionsRef = useRef<PositionMap>({});

  // Apply the active layout once on mount (if any), so a saved arrangement is
  // restored without the user re-applying it. When no `initial` was provided
  // server-side, fetch the saved layouts from the API on mount.
  const appliedInitial = useRef(false);
  useEffect(() => {
    if (appliedInitial.current) return;
    appliedInitial.current = true;

    if (initial) {
      if (initial.activeId) {
        const active = initial.layouts.find((l) => l.id === initial.activeId);
        if (active) setPositionOverrides({ ...active.positions });
      }
      return;
    }

    if (!siteId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/diagram-layouts?siteId=${encodeURIComponent(siteId)}&key=${encodeURIComponent(String(diagramKey))}`,
        );
        if (!res.ok) return;
        const json = await res.json();
        const parsed = parseDiagramLayouts(json?.value);
        if (cancelled) return;
        setLayouts(parsed.layouts);
        setActiveId(parsed.activeId);
        if (parsed.activeId) {
          const active = parsed.layouts.find((l) => l.id === parsed.activeId);
          if (active) setPositionOverrides({ ...active.positions });
        }
      } catch (error) {
        console.error("[diagram-layouts] initial fetch failed", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial, siteId, diagramKey]);

  const onNodesChange = useCallback(
    (
      changes: NodeChange[],
      nodes: MinimalNode[],
      childrenMap: Map<string, string[]>,
    ) => {
      setPositionOverrides((current) => {
        let next: PositionMap | null = null;
        const byId = new Map(nodes.map((node) => [node.id, node]));

        for (const change of changes) {
          if (change.type !== "position" || !change.position) continue;
          const node = byId.get(change.id);
          next = next ?? { ...current };
          next[change.id] = change.position;
          if (!node) continue;

          const dx = change.position.x - node.position.x;
          const dy = change.position.y - node.position.y;
          if (dx === 0 && dy === 0) continue;

          const stack = [...(childrenMap.get(change.id) ?? [])];
          while (stack.length > 0) {
            const childId = stack.pop()!;
            const child = byId.get(childId);
            if (child) {
              next[childId] = {
                x: child.position.x + dx,
                y: child.position.y + dy,
              };
            }
            stack.push(...(childrenMap.get(childId) ?? []));
          }
        }
        return next ?? current;
      });
    },
    [],
  );

  const resetOverrides = useCallback(() => {
    setPositionOverrides({});
    setActiveId(null);
  }, []);

  /** Restore node positions to the initial view: saved active layout or computed default. */
  const resetDiagram = useCallback(() => {
    if (activeId) {
      const active = layouts.find((l) => l.id === activeId);
      if (active) {
        setPositionOverrides({ ...active.positions });
        return;
      }
    }
    setPositionOverrides({});
    setActiveId(null);
  }, [activeId, layouts]);

  const persist = useCallback(
    async (nextLayouts: DiagramLayout[], nextActiveId: string | null) => {
      // Optimistic local update.
      setLayouts(nextLayouts);
      setActiveId(nextActiveId);

      if (!siteId) {
        toast({
          title: "Layout non salvato",
          description: "Sito non identificato.",
          variant: "destructive",
        });
        return;
      }

      setIsSaving(true);
      try {
        const payload: DiagramLayoutsSetting = {
          activeId: nextActiveId,
          layouts: nextLayouts,
        };
        const res = await fetch("/api/diagram-layouts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId, key: diagramKey, value: payload }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const saved = parseDiagramLayouts(json?.value);
        setLayouts(saved.layouts);
        setActiveId(saved.activeId);
      } catch (error) {
        console.error("[diagram-layouts] save failed", error);
        toast({
          title: "Salvataggio layout fallito",
          description: "Riprova piu tardi.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [diagramKey, siteId, toast],
  );

  const capturePositions = useCallback((): PositionMap => {
    return { ...positionsRef.current };
  }, []);

  const applyLayout = useCallback(
    (id: string) => {
      const layout = layouts.find((l) => l.id === id);
      if (!layout) return;
      setPositionOverrides({ ...layout.positions });
      setActiveId(id);
    },
    [layouts],
  );

  const saveActive = useCallback(() => {
    const positions = capturePositions();
    const now = new Date().toISOString();
    if (activeId && layouts.some((l) => l.id === activeId)) {
      const next = layouts.map((l) =>
        l.id === activeId ? { ...l, positions, updatedAt: now } : l,
      );
      void persist(next, activeId);
      toast({ title: "Layout salvato" });
      return;
    }
    // No active layout: nothing to overwrite; caller should use saveAsNew.
  }, [activeId, capturePositions, layouts, persist, toast]);

  const saveAsNew = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const positions = capturePositions();
      const layout: DiagramLayout = {
        id: createLayoutId(),
        name: trimmed,
        positions,
        updatedAt: new Date().toISOString(),
      };
      void persist([...layouts, layout], layout.id);
      toast({ title: "Layout creato", description: trimmed });
    },
    [capturePositions, layouts, persist, toast],
  );

  const rename = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const next = layouts.map((l) =>
        l.id === id ? { ...l, name: trimmed } : l,
      );
      void persist(next, activeId);
    },
    [activeId, layouts, persist],
  );

  const remove = useCallback(
    (id: string) => {
      const next = layouts.filter((l) => l.id !== id);
      const nextActive = activeId === id ? null : activeId;
      void persist(next, nextActive);
      if (activeId === id) setPositionOverrides({});
    },
    [activeId, layouts, persist],
  );

  return {
    editMode,
    setEditMode,
    positionOverrides,
    positionsRef,
    onNodesChange,
    resetOverrides,
    resetDiagram,
    layouts,
    activeId,
    isSaving,
    hasActive: Boolean(activeId),
    applyLayout,
    saveActive,
    saveAsNew,
    rename,
    remove,
  };
}

export type DiagramLayoutsController = ReturnType<typeof useDiagramLayouts>;
