"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  BarChart3,
  ChevronDown,
  ExternalLink,
  FolderKanban,
  LayoutDashboard,
  X,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getModuleFaIcon } from "@/lib/module-fa-icons";
import { getKanbanIcon } from "@/lib/kanban-icons";
import { DiagramStage } from "@/components/diagram/diagram-stage";
import { DiagramEditToolbar } from "@/components/diagram/diagram-edit-toolbar";
import { DiagramRefreshButton } from "@/components/diagram/diagram-refresh-button";
import { useDiagramLayouts } from "@/components/diagram/use-diagram-layouts";
import { faIndustry } from "@fortawesome/free-solid-svg-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KanbanColumnsChart } from "@/components/home/KanbanColumnsChart";
import type { FlowchartNodeStyle } from "@/lib/flowchart-settings";
import type {
  WbsCategoryKey,
  WbsLeafAvatar,
  WbsLeafDetail,
  WbsTree,
} from "@/lib/wbs-data";

interface WbsDiagramProps {
  tree: WbsTree;
  domain: string;
  nodeStyle?: FlowchartNodeStyle;
  siteId?: string;
}

/* ---------------------------- node shapes ----------------------------- */

function rootShape(style: FlowchartNodeStyle): string {
  return style === "rect" ? "rounded-2xl" : "rounded-full";
}

function categoryShape(style: FlowchartNodeStyle): string {
  if (style === "rect") return "rounded-md";
  if (style === "oval") return "rounded-full";
  return "rounded-xl";
}

function moduleShape(style: FlowchartNodeStyle): string {
  if (style === "rect") return "rounded-md";
  if (style === "oval") return "rounded-full";
  return "rounded-lg";
}

function leafShape(style: FlowchartNodeStyle): string {
  return style === "oval" ? "rounded-full" : "rounded-md";
}

/* ------------------------------- layout ------------------------------- */

const ROOT_W = 180;
const CAT_W = 196;
const CAT_SLOT = 220;
const MOD_W = 184;
const MOD_SLOT = 204;
const LEAF_W = 188;
const LEAF_H = 46;
const LEAF_GAP = 10;
const GROUP_GAP = 52;

const COL_W = 164;
const COL_H = 40;
const COL_GAP = 10;

const ROOT_Y = 0;
const CAT_Y = 240;
const MOD_Y = 395;
const LEAF_Y = 505;

/* ------------------------------ node data ------------------------------ */

type RootData = {
  label: string;
  sublabel?: string;
  initials: string;
  nodeStyle: FlowchartNodeStyle;
};

type CategoryData = {
  label: string;
  category: WbsCategoryKey;
  count: number;
  expanded: boolean;
  nodeStyle: FlowchartNodeStyle;
  onToggle: () => void;
};

type ModuleData = {
  label: string;
  category: WbsCategoryKey;
  icon?: string;
  badge?: string;
  hasItems: boolean;
  expanded: boolean;
  nodeStyle: FlowchartNodeStyle;
  onToggle: () => void;
  onOpen: () => void;
};

type LeafData = {
  label: string;
  badge?: string;
  color?: string;
  icon?: string;
  avatar?: WbsLeafAvatar;
  hasDetail: boolean;
  nodeStyle: FlowchartNodeStyle;
  /** Opens the summary dialog (leaves with detail). */
  onSelect?: () => void;
  /** Navigates to the leaf deep link (leaves with href but no detail). */
  onOpen?: () => void;
  /** When true, the leaf shows a chevron to expand its children (columns). */
  hasChildren?: boolean;
  expanded?: boolean;
  onToggleChildren?: () => void;
};

type ColumnData = {
  label: string;
  badge?: string;
  color?: string;
  nodeStyle: FlowchartNodeStyle;
};

type RootFlowNode = Node<RootData, "wbsRoot">;
type CategoryFlowNode = Node<CategoryData, "wbsCategory">;
type ModuleFlowNode = Node<ModuleData, "wbsModule">;
type LeafFlowNode = Node<LeafData, "wbsLeaf">;
type ColumnFlowNode = Node<ColumnData, "wbsColumn">;
type WbsFlowNode =
  | RootFlowNode
  | CategoryFlowNode
  | ModuleFlowNode
  | LeafFlowNode
  | ColumnFlowNode;

/* ------------------------------- styling ------------------------------- */

const CATEGORY_ACCENTS: Record<
  WbsCategoryKey,
  { node: string; icon: string; edge: string }
> = {
  core: {
    node: "border-info",
    icon: "text-info",
    edge: "hsl(var(--info))",
  },
  management: {
    node: "border-primary",
    icon: "text-primary",
    edge: "hsl(var(--primary))",
  },
  tools: {
    node: "border-warning",
    icon: "text-warning",
    edge: "hsl(var(--warning))",
  },
  reports: {
    node: "border-success",
    icon: "text-success",
    edge: "hsl(var(--success))",
  },
};

const CATEGORY_ICONS: Record<
  WbsCategoryKey,
  React.ComponentType<{ className?: string }>
> = {
  core: LayoutDashboard,
  management: FolderKanban,
  tools: Wrench,
  reports: BarChart3,
};

const hiddenHandle =
  "!h-1.5 !w-1.5 !min-h-0 !min-w-0 !border-0 !bg-transparent";

/* ----------------------------- node renders ---------------------------- */

function RootNode({ data }: NodeProps<RootFlowNode>) {
  return (
    <div className="flex flex-col items-center gap-2" style={{ width: ROOT_W }}>
      <div
        className={cn(
          "flex h-32 w-32 items-center justify-center border-4 border-primary bg-primary text-primary-foreground shadow-2xl ring-4 ring-primary/40",
          rootShape(data.nodeStyle)
        )}
        aria-label={data.label}
      >
        {/* Explicit font size: FA's own svg sizing (1em) wins over h-* classes */}
        <FontAwesomeIcon icon={faIndustry} style={{ fontSize: "3.25rem" }} />
      </div>
      <div className="text-center">
        <p className="diagram-node-floating-label text-base font-semibold">
          {data.label}
        </p>
        {data.sublabel && (
          <p className="diagram-node-floating-label-muted text-sm">
            {data.sublabel}
          </p>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={hiddenHandle}
      />
    </div>
  );
}

function CategoryNode({ data }: NodeProps<CategoryFlowNode>) {
  const accent = CATEGORY_ACCENTS[data.category];
  const Icon = CATEGORY_ICONS[data.category];
  return (
    <button
      type="button"
      onClick={data.onToggle}
      aria-expanded={data.expanded}
      aria-label={`${data.label}: ${data.expanded ? "comprimi" : "espandi"} moduli`}
      className={cn(
        "diagram-node-surface flex items-center justify-center gap-2 border-[3px] px-4 py-3 transition-colors hover:brightness-110",
        categoryShape(data.nodeStyle),
        accent.node,
      )}
      style={{ width: CAT_W, backgroundColor: "#000000" }}
    >
      <Icon className={cn("h-5 w-5 shrink-0", accent.icon)} />
      <span className="text-base font-semibold text-foreground">
        {data.label}
      </span>
      <span className="rounded-full bg-card px-2 text-sm font-medium text-foreground">
        {data.count}
      </span>
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-foreground/70 transition-transform",
          data.expanded && "rotate-180"
        )}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={hiddenHandle}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={hiddenHandle}
      />
    </button>
  );
}

function ModuleNode({ data }: NodeProps<ModuleFlowNode>) {
  const accent = CATEGORY_ACCENTS[data.category];
  const moduleIcon = getModuleFaIcon(data.icon);
  return (
    <div
      className={cn(
        "diagram-node-surface flex items-stretch overflow-hidden border-[3px]",
        moduleShape(data.nodeStyle),
        accent.node,
      )}
      style={{ width: MOD_W, backgroundColor: "#000000" }}
    >
      <button
        type="button"
        onClick={data.onOpen}
        aria-label={`Apri modulo ${data.label}`}
        className="diagram-node-surface-hover flex flex-1 items-center justify-center gap-2 px-3 py-2.5 text-center text-[15px] font-semibold text-white transition-colors"
      >
        {moduleIcon && (
          <FontAwesomeIcon
            icon={moduleIcon}
            className={cn("h-4 w-4 shrink-0", accent.icon)}
          />
        )}
        <span>{data.label}</span>
        {data.badge !== undefined && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
            {data.badge}
          </span>
        )}
      </button>
      {data.hasItems && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            data.onToggle();
          }}
          aria-expanded={data.expanded}
          aria-label={`${data.label}: ${data.expanded ? "nascondi" : "mostra"} contenuti`}
          className="diagram-node-surface-hover flex w-8 items-center justify-center border-l border-white/20 transition-colors"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              accent.icon,
              data.expanded && "rotate-180"
            )}
          />
        </button>
      )}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={hiddenHandle}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={hiddenHandle}
      />
    </div>
  );
}

function LeafNode({ data }: NodeProps<LeafFlowNode>) {
  const interactive = data.hasDetail || Boolean(data.onOpen);
  const Inner = interactive ? "button" : "div";
  const KanbanIcon = data.icon ? getKanbanIcon(data.icon) : null;

  return (
    <div
      className={cn(
        "diagram-node-surface flex items-stretch overflow-hidden border-[3px] text-sm font-medium",
        leafShape(data.nodeStyle),
      )}
      style={{
        width: LEAF_W,
        backgroundColor: "#000000",
        ...(data.color ? { borderColor: data.color } : {}),
      }}
    >
      <Inner
        type={interactive ? "button" : undefined}
        onClick={data.hasDetail ? data.onSelect : data.onOpen}
        aria-label={
          data.hasDetail
            ? `Mostra riassunto di ${data.label}`
            : data.onOpen
              ? `Apri ${data.label}`
              : undefined
        }
        className={cn(
          "diagram-node-surface-hover flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left text-white",
          interactive && "cursor-pointer transition-colors",
        )}
      >
        {data.avatar ? (
          data.avatar.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.avatar.imageUrl}
              alt=""
              className="h-7 w-7 shrink-0 rounded-full border border-foreground/20 object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-muted text-[10px] font-bold text-foreground"
              style={
                data.avatar.color
                  ? { backgroundColor: data.avatar.color, color: "#fff" }
                  : undefined
              }
            >
              {data.avatar.initials}
            </span>
          )
        ) : KanbanIcon ? (
          <KanbanIcon
            aria-hidden
            className="h-4 w-4 shrink-0"
            style={data.color ? { color: data.color } : undefined}
          />
        ) : data.color ? (
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: data.color }}
          />
        ) : null}
        <span className="min-w-0 flex-1 truncate text-white">{data.label}</span>
        {data.badge !== undefined && (
          <span className="shrink-0 rounded-full bg-muted px-1.5 text-xs font-semibold text-foreground">
            {data.badge}
          </span>
        )}
      </Inner>
      {data.hasChildren && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            data.onToggleChildren?.();
          }}
          aria-expanded={data.expanded}
          aria-label={`${data.label}: ${data.expanded ? "nascondi" : "mostra"} colonne`}
          className="diagram-node-surface-hover flex w-7 shrink-0 items-center justify-center border-l border-white/20 transition-colors"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              data.expanded && "rotate-180",
            )}
          />
        </button>
      )}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={hiddenHandle}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={hiddenHandle}
      />
    </div>
  );
}

function ColumnNode({ data }: NodeProps<ColumnFlowNode>) {
  return (
    <div
      className="diagram-node-surface flex items-center gap-2 rounded-md border-[3px] px-2.5 py-1.5 text-xs font-medium"
      style={{
        width: COL_W,
        backgroundColor: "#000000",
        ...(data.color ? { borderColor: data.color } : {}),
      }}
    >
      <span className="min-w-0 flex-1 truncate text-white">{data.label}</span>
      {data.badge !== undefined && (
        <span className="shrink-0 rounded-full bg-muted px-1.5 text-[11px] font-semibold text-foreground">
          {data.badge}
        </span>
      )}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={hiddenHandle}
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  wbsRoot: RootNode,
  wbsCategory: CategoryNode,
  wbsModule: ModuleNode,
  wbsLeaf: LeafNode,
  wbsColumn: ColumnNode,
};

/* ------------------------------- diagram ------------------------------- */

function WbsDiagramInner({
  tree,
  domain,
  nodeStyle = "hybrid",
  siteId,
}: WbsDiagramProps) {
  const router = useRouter();
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<WbsLeafDetail | null>(null);
  const [detailHref, setDetailHref] = useState<string | null>(null);

  const layout = useDiagramLayouts({ siteId, diagramKey: "home-wbs" });
  const { editMode, setEditMode, positionOverrides, positionsRef, resetDiagram } =
    layout;

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(tree.categories.map((category) => category.category))
  );
  // Level-3 nodes are visible by default.
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () =>
      new Set(
        tree.categories.flatMap((category) =>
          category.modules
            .filter((module) => module.items.length > 0)
            .map((module) => module.name)
        )
      )
  );
  // Level-4 (leaf children, e.g. kanban columns): collapsed by default.
  const [expandedLeaves, setExpandedLeaves] = useState<Set<string>>(
    () => new Set(),
  );

  const treeSignature = useMemo(
    () =>
      tree.categories
        .map(
          (category) =>
            `${category.category}:${category.modules.map((module) => module.name).join(",")}`,
        )
        .join("|"),
    [tree.categories],
  );

  // Latest tree, readable from effects without retriggering them on every
  // RSC refetch (the tree object identity changes on each server render).
  const treeRef = useRef(tree);
  treeRef.current = tree;

  // Reset expansion/detail state only when the tree structure really changes
  // (signature), NOT on every refetch: depending on the `tree` object would
  // close the chart dialog as soon as any RSC refresh lands.
  useEffect(() => {
    const currentTree = treeRef.current;
    setExpandedCategories(
      new Set(currentTree.categories.map((category) => category.category)),
    );
    setExpandedModules(
      new Set(
        currentTree.categories.flatMap((category) =>
          category.modules
            .filter((module) => module.items.length > 0)
            .map((module) => module.name),
        ),
      ),
    );
    setDetail(null);
    setDetailHref(null);
  }, [treeSignature]);

  const resetExpansionState = useCallback(() => {
    const currentTree = treeRef.current;
    setExpandedCategories(
      new Set(currentTree.categories.map((category) => category.category)),
    );
    setExpandedModules(
      new Set(
        currentTree.categories.flatMap((category) =>
          category.modules
            .filter((module) => module.items.length > 0)
            .map((module) => module.name),
        ),
      ),
    );
    setExpandedLeaves(new Set());
    setDetail(null);
    setDetailHref(null);
  }, []);

  const fitDiagram = useCallback(() => {
    const element = wrapperRef.current;
    if (!element || element.clientWidth === 0 || element.clientHeight === 0) {
      return;
    }

    fitView({ padding: 0.12, duration: 200 });
  }, [fitView]);

  const handleRefresh = () => {
    resetDiagram();
    setEditMode(false);
    resetExpansionState();
    requestAnimationFrame(fitDiagram);
    window.setTimeout(fitDiagram, 120);
    window.setTimeout(fitDiagram, 320);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const toggleModule = (moduleName: string) => {
    setExpandedModules((current) => {
      const next = new Set(current);
      if (next.has(moduleName)) next.delete(moduleName);
      else next.add(moduleName);
      return next;
    });
  };

  const toggleLeaf = (leafId: string) => {
    setExpandedLeaves((current) => {
      const next = new Set(current);
      if (next.has(leafId)) next.delete(leafId);
      else next.add(leafId);
      return next;
    });
  };

  // Node positions (`positionOverrides`) and edit mode are managed by the
  // shared layouts controller, which also handles saving named layouts.
  // Positions are keyed by stable node ids, so they survive tree refetches.

  const { nodes, edges } = useMemo(() => {
    const nodes: WbsFlowNode[] = [];
    const edges: Edge[] = [];

    // Width of each category block (expanded categories widen to fit modules).
    const categoryWidths = tree.categories.map((category) => {
      const expanded = expandedCategories.has(category.category);
      return expanded && category.modules.length > 0
        ? Math.max(CAT_SLOT, category.modules.length * MOD_SLOT)
        : CAT_SLOT;
    });
    const totalWidth =
      categoryWidths.reduce((sum, width) => sum + width, 0) +
      GROUP_GAP * Math.max(0, tree.categories.length - 1);

    nodes.push({
      id: "wbs-root",
      type: "wbsRoot",
      position: { x: -ROOT_W / 2, y: ROOT_Y },
      data: { ...tree.root, nodeStyle },
    });

    let offsetX = -totalWidth / 2;

    tree.categories.forEach((category, index) => {
      const blockWidth = categoryWidths[index];
      const blockCenter = offsetX + blockWidth / 2;
      offsetX += blockWidth + GROUP_GAP;

      const categoryId = `cat-${category.category}`;
      const expanded = expandedCategories.has(category.category);

      nodes.push({
        id: categoryId,
        type: "wbsCategory",
        position: { x: blockCenter - CAT_W / 2, y: CAT_Y },
        data: {
          label: category.label,
          category: category.category,
          count: category.modules.length,
          expanded,
          nodeStyle,
          onToggle: () => toggleCategory(category.category),
        },
      });

      edges.push({
        id: `e-root-${categoryId}`,
        source: "wbs-root",
        target: categoryId,
        sourceHandle: "bottom",
        targetHandle: "top",
        type: "smoothstep",
        style: {
          stroke: CATEGORY_ACCENTS[category.category].edge,
          strokeWidth: 2.5,
        },
      });

      if (!expanded) return;

      const modulesWidth = category.modules.length * MOD_SLOT;
      const modulesStart = blockCenter - modulesWidth / 2;

      category.modules.forEach((module, moduleIndex) => {
        const moduleCenter =
          modulesStart + moduleIndex * MOD_SLOT + MOD_SLOT / 2;
        const moduleId = `mod-${module.name}`;
        const moduleExpanded = expandedModules.has(module.name);

        nodes.push({
          id: moduleId,
          type: "wbsModule",
          position: { x: moduleCenter - MOD_W / 2, y: MOD_Y },
          data: {
            label: module.label,
            category: category.category,
            icon: module.icon,
            badge: module.badge,
            hasItems: module.items.length > 0,
            expanded: moduleExpanded,
            nodeStyle,
            onToggle: () => toggleModule(module.name),
            onOpen: () =>
              router.push(`/sites/${domain}${module.href}?view=diagram`),
          },
        });

        edges.push({
          id: `e-${categoryId}-${moduleId}`,
          source: categoryId,
          target: moduleId,
          sourceHandle: "bottom",
          targetHandle: "top",
          type: "smoothstep",
          style: {
            stroke: "hsl(var(--muted-foreground))",
            strokeWidth: 2,
          },
        });

        if (!moduleExpanded) return;

        const leafX = moduleCenter - LEAF_W / 2 + 20;
        // Vertical cursor: leaves stack downward, and an expanded leaf's
        // children (columns) are inserted as a vertical column directly below
        // it, pushing the following sibling leaves further down.
        let cursorY = LEAF_Y;

        module.items.forEach((item) => {
          const leafId = `leaf-${module.name}-${item.id}`;
          const leafY = cursorY;
          const hasChildren = Boolean(item.children?.length);
          const leafExpanded = hasChildren && expandedLeaves.has(leafId);

          nodes.push({
            id: leafId,
            type: "wbsLeaf",
            position: {
              x: leafX,
              y: leafY,
            },
            data: {
              label: item.label,
              badge: item.badge,
              color: item.color,
              icon: item.icon,
              avatar: item.avatar,
              hasDetail: Boolean(item.detail),
              nodeStyle,
              hasChildren,
              expanded: leafExpanded,
              onToggleChildren: hasChildren
                ? () => toggleLeaf(leafId)
                : undefined,
              onSelect: item.detail
                ? () => {
                    setDetail(item.detail ?? null);
                    setDetailHref(item.href ?? null);
                  }
                : undefined,
              onOpen: !item.detail && item.href
                ? () => router.push(`/sites/${domain}${item.href}`)
                : undefined,
            },
          });

          edges.push({
            id: `e-${moduleId}-${leafId}`,
            source: moduleId,
            target: leafId,
            sourceHandle: "bottom",
            targetHandle: "left",
            type: "smoothstep",
            style: {
              stroke: "hsl(var(--muted-foreground))",
              strokeWidth: 1.75,
            },
          });

          cursorY += LEAF_H + LEAF_GAP;

          // Level-4: expanded leaf children (e.g. kanban columns) stacked
          // vertically below the leaf, slightly indented.
          if (leafExpanded && item.children) {
            const columnX = leafX + 24;
            item.children.forEach((column, columnIndex) => {
              const columnId = `col-${module.name}-${item.id}-${column.id}`;
              const columnY = cursorY + columnIndex * (COL_H + COL_GAP);
              nodes.push({
                id: columnId,
                type: "wbsColumn",
                position: {
                  x: columnX,
                  y: columnY,
                },
                data: {
                  label: column.label,
                  badge: column.badge,
                  color: column.color,
                  nodeStyle,
                },
              });

              edges.push({
                id: `e-${leafId}-${columnId}`,
                source: leafId,
                target: columnId,
                sourceHandle: "bottom",
                targetHandle: "top",
                type: "smoothstep",
                style: {
                  stroke: column.color ?? "hsl(var(--muted-foreground))",
                  strokeWidth: 1.5,
                },
              });
            });
            cursorY +=
              item.children.length * (COL_H + COL_GAP) + LEAF_GAP;
          }
        });
      });
    });

    return { nodes, edges };
    // toggleCategory/toggleModule/toggleLeaf are stable enough for this memo:
    // they only wrap setState updaters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tree,
    domain,
    nodeStyle,
    expandedCategories,
    expandedModules,
    expandedLeaves,
    router,
  ]);

  // Apply user-dragged positions on top of the computed layout.
  const displayNodes = useMemo(
    () =>
      nodes.map((node) =>
        positionOverrides[node.id]
          ? { ...node, position: positionOverrides[node.id] }
          : node
      ),
    [nodes, positionOverrides]
  );

  // Parent → children map derived from the edges, used to drag a node
  // together with all of its descendants.
  const childrenMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const edge of edges) {
      const list = map.get(edge.source) ?? [];
      list.push(edge.target);
      map.set(edge.source, list);
    }
    return map;
  }, [edges]);

  // Keep the full position map available to the layout-save controller.
  positionsRef.current = Object.fromEntries(
    displayNodes.map((node) => [node.id, node.position]),
  );

  // Latest displayed nodes, readable from the drag handler without
  // re-creating it on every render.
  const displayNodesRef = useRef<WbsFlowNode[]>(displayNodes);
  displayNodesRef.current = displayNodes;

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      layout.onNodesChange(changes, displayNodesRef.current, childrenMap);
    },
    [layout, childrenMap],
  );

  // Re-fit only after React Flow has measured every node (avoids the broken
  // "staircase" viewport when fitView runs too early on the home page).
  useEffect(() => {
    if (!nodesInitialized || nodes.length === 0) return;

    const frame = requestAnimationFrame(() => {
      fitDiagram();
    });
    const timeout = window.setTimeout(fitDiagram, 120);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [
    nodesInitialized,
    nodes.length,
    expandedCategories,
    expandedModules,
    expandedLeaves,
    treeSignature,
    fitDiagram,
  ]);

  // Instantly adapt the diagram to the window/container size.
  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    let timeout: number | undefined;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        if (nodesInitialized) fitDiagram();
      }, 120);
    });
    observer.observe(element);

    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, [fitDiagram, nodesInitialized]);

  return (
    <div ref={wrapperRef} className="relative h-full w-full">
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onInit={() => {
          requestAnimationFrame(() => fitDiagram());
        }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={editMode}
        nodesConnectable={false}
        elementsSelectable={false}
        selectNodesOnDrag={false}
        nodeDragThreshold={8}
        /* Without this, React Flow sets pointer-events: none on nodes that are
           neither draggable nor selectable, breaking the chevron toggles and
           the chart dialog when edit mode is off. */
        onNodeClick={() => {}}
        zoomOnScroll
        zoomOnPinch
        panOnDrag
        proOptions={{ hideAttribution: true }}
        className="!bg-transparent"
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
          <DiagramEditToolbar controller={layout} />
          <DiagramRefreshButton onRefresh={handleRefresh} showFeedback />
        </div>
        {editMode && (
          <p className="absolute left-3 top-3 z-10 max-w-[280px] rounded-lg border border-border bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm">
            Trascina un nodo per spostarlo: le sottocategorie collegate si
            muovono insieme.
          </p>
        )}
        <Controls
          showInteractive={false}
          position="bottom-right"
          className="diagram-stage-chrome !rounded-lg !border !shadow-md [&>button]:!border-b-border [&>button]:!bg-transparent [&>button]:!text-inherit [&>button:hover]:!brightness-105 [&>button>svg]:!fill-current"
        />
      </ReactFlow>

      {/* Histogram dialog for kanban leaves (sections with chart data) */}
      {detail && detail.sections.some((section) => section.chart) && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setDetail(null);
              setDetailHref(null);
            }
          }}
        >
          <DialogContent className="flex max-h-[88vh] w-fit max-w-[96vw] flex-col gap-3 sm:max-w-[96vw]">
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
                <DialogTitle>{detail.title}</DialogTitle>
                {detailHref && (
                  <button
                    type="button"
                    onClick={() => {
                      const href = detailHref;
                      setDetail(null);
                      setDetailHref(null);
                      router.push(`/sites/${domain}${href}`);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Vai alla bacheca
                  </button>
                )}
              </div>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
              {detail.sections.map((section, sectionIndex) => (
                <div key={`${section.title}-${sectionIndex}`}>
                  <p className="mb-2 text-sm font-semibold text-foreground">
                    {section.title}
                  </p>
                  {section.chart && section.chart.length > 0 ? (
                    <KanbanColumnsChart data={section.chart} />
                  ) : (
                    <p className="text-xs italic text-muted-foreground">
                      Nessuna colonna presente.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Text summary panel for level-3 nodes without chart data */}
      {detail && !detail.sections.some((section) => section.chart) && (
        <div className="absolute bottom-3 right-3 top-14 z-20 flex w-80 max-w-[85%] flex-col overflow-hidden rounded-lg border bg-card shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              {detail.title}
            </h3>
            <button
              type="button"
              onClick={() => setDetail(null)}
              aria-label="Chiudi riassunto"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
            {detail.sections.map((section, sectionIndex) => (
              <div key={`${section.title}-${sectionIndex}`}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </p>
                <div className="overflow-hidden rounded-md border">
                  {section.rows.length === 0 ? (
                    <p className="px-3 py-2 text-xs italic text-muted-foreground">
                      Nessuna colonna presente.
                    </p>
                  ) : (
                    section.rows.map((row, rowIndex) => (
                      <div
                        key={`${row.label}-${rowIndex}`}
                        className={cn(
                          "flex items-center justify-between gap-3 px-3 py-1.5 text-sm",
                          rowIndex % 2 === 1 && "bg-muted/50"
                        )}
                      >
                        <span className="truncate text-foreground">
                          {row.label}
                        </span>
                        <span className="shrink-0 font-medium text-foreground">
                          {row.value}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WbsDiagram(props: WbsDiagramProps) {
  return (
    <DiagramStage variant="full" className="min-h-[480px]">
      <ReactFlowProvider>
        <WbsDiagramInner {...props} />
      </ReactFlowProvider>
    </DiagramStage>
  );
}
