"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
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
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/utils";
import { getModuleFaIcon } from "@/lib/module-fa-icons";
import { getKanbanIcon } from "@/lib/kanban-icons";
import { DiagramStage } from "@/components/diagram/diagram-stage";
import { DiagramEditToolbar } from "@/components/diagram/diagram-edit-toolbar";
import { useDiagramLayouts } from "@/components/diagram/use-diagram-layouts";
import {
  panelContentHeight,
  type AreaTreeListPanel,
  type AreaTreeRoot,
  type AreaTreeSector,
} from "@/lib/area-tree-diagram";
import type {
  DiagramKey,
  DiagramLayoutsSetting,
} from "@/lib/diagram-layouts";

export interface AreaTreeDiagramProps {
  root: AreaTreeRoot;
  sectors: AreaTreeSector[];
  className?: string;
  siteId?: string;
  diagramKey?: DiagramKey | string;
  initialLayouts?: DiagramLayoutsSetting;
}

// Content-driven width estimation (px). Keeps boxes compact while ensuring
// labels and badges fit without truncation.
const CHAR_W = 7.2;
const PANEL_MIN = 152;
const PANEL_MAX = 244;
const SECTOR_MIN = 150;
const SECTOR_MAX = 320;
const PANEL_GAP = 14;
const GROUP_GAP = 40;

const ROOT_W = 168;
const ROOT_H = 150;
const SECTOR_H = 52;
const ROOT_Y = 0;
const SECTOR_Y = 200;
const PANEL_Y = 290;

const hiddenHandle =
  "!h-1.5 !w-1.5 !min-h-0 !min-w-0 !border-0 !bg-transparent";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function estimateRowWidth(label: string, hasBadge: boolean): number {
  return Math.ceil(label.length * CHAR_W) + (hasBadge ? 40 : 0) + 28;
}

function panelWidth(panel: AreaTreeListPanel): number {
  let widest = panel.title ? estimateRowWidth(panel.title, false) : 0;
  for (const row of panel.rows) {
    widest = Math.max(
      widest,
      estimateRowWidth(row.label, row.badge !== undefined),
    );
  }
  if (panel.moreCount && panel.moreCount > 0) {
    widest = Math.max(widest, estimateRowWidth(`+${panel.moreCount} altri`, false));
  }
  return clamp(widest, PANEL_MIN, PANEL_MAX);
}

function sectorHeaderWidth(sector: AreaTreeSector): number {
  const iconAllowance = sector.icon || sector.faIcon || sector.color ? 28 : 0;
  const badgeAllowance = sector.badge !== undefined ? 34 : 0;
  return clamp(
    Math.ceil(sector.label.length * CHAR_W) + iconAllowance + badgeAllowance + 28,
    SECTOR_MIN,
    SECTOR_MAX,
  );
}

type RootData = AreaTreeRoot & { width: number };
type SectorData = AreaTreeSector & { width: number };
type PanelData = AreaTreeListPanel & { width: number; accentColor?: string };

type RootFlowNode = Node<RootData, "areaRoot">;
type SectorFlowNode = Node<SectorData, "areaSector">;
type PanelFlowNode = Node<PanelData, "areaPanel">;
type AreaFlowNode = RootFlowNode | SectorFlowNode | PanelFlowNode;

function RootNode({ data }: NodeProps<RootFlowNode>) {
  const moduleIcon = data.icon ? getModuleFaIcon(data.icon) : null;
  return (
    <div className="flex flex-col items-center gap-2" style={{ width: data.width }}>
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-primary bg-primary text-primary-foreground shadow-2xl ring-4 ring-primary/30"
        aria-label={data.label}
        style={
          data.color
            ? { borderColor: data.color, backgroundColor: data.color }
            : undefined
        }
      >
        {moduleIcon ? (
          <FontAwesomeIcon icon={moduleIcon} style={{ fontSize: "2.5rem" }} />
        ) : (
          <span className="text-2xl font-bold">
            {data.label.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-foreground">{data.label}</p>
        {data.sublabel ? (
          <p className="text-sm text-muted-foreground">{data.sublabel}</p>
        ) : null}
      </div>
      <Handle type="source" position={Position.Bottom} id="bottom" className={hiddenHandle} />
    </div>
  );
}

function SectorNode({ data }: NodeProps<SectorFlowNode>) {
  const KanbanIcon = data.icon ? getKanbanIcon(data.icon) : null;
  const faIcon = data.faIcon ? getModuleFaIcon(data.faIcon) : null;

  return (
    <div
      className="flex items-center justify-center gap-2 rounded-xl border-2 border-foreground/25 bg-card px-3 py-2.5 shadow-lg ring-1 ring-black/5 dark:ring-white/10"
      style={{
        width: data.width,
        ...(data.color ? { borderColor: data.color } : {}),
      }}
    >
      {KanbanIcon ? (
        <KanbanIcon
          aria-hidden
          className="h-5 w-5 shrink-0"
          style={data.color ? { color: data.color } : undefined}
        />
      ) : faIcon ? (
        <FontAwesomeIcon
          icon={faIcon as IconDefinition}
          className="h-5 w-5 shrink-0 text-primary"
          style={data.color ? { color: data.color } : undefined}
        />
      ) : data.color ? (
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: data.color }}
        />
      ) : null}
      <span className="truncate text-[15px] font-semibold text-foreground">
        {data.label}
      </span>
      {data.badge !== undefined ? (
        <span className="shrink-0 rounded-full bg-muted px-2 text-sm font-medium text-foreground">
          {data.badge}
        </span>
      ) : null}
      <Handle type="target" position={Position.Top} id="top" className={hiddenHandle} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={hiddenHandle} />
    </div>
  );
}

function PanelNode({ data }: NodeProps<PanelFlowNode>) {
  return (
    <div
      className="overflow-hidden rounded-md border-2 border-foreground/20 bg-card shadow-lg ring-1 ring-black/5 dark:ring-white/10"
      style={{
        width: data.width,
        ...(data.accentColor ? { borderColor: data.accentColor } : {}),
      }}
    >
      {data.title ? (
        <div className="border-b border-border/60 bg-muted/40 px-3 py-2">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-foreground">
            {data.title}
          </p>
        </div>
      ) : null}
      {data.rows.length > 0 ? (
        <ul className="divide-y divide-border/50">
          {data.rows.map((row) => {
            const Wrapper = row.onClick ? "button" : "div";
            return (
              <Wrapper
                key={row.id}
                type={row.onClick ? "button" : undefined}
                onClick={row.onClick}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm",
                  row.onClick &&
                    "cursor-pointer transition-colors hover:bg-accent/60",
                )}
              >
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {row.label}
                </span>
                {row.badge !== undefined ? (
                  <span className="shrink-0 rounded-full bg-muted px-1.5 text-xs font-semibold text-foreground">
                    {row.badge}
                  </span>
                ) : null}
              </Wrapper>
            );
          })}
        </ul>
      ) : (
        <p className="px-3 py-3 text-xs text-muted-foreground">Nessun elemento.</p>
      )}
      {data.moreCount && data.moreCount > 0 && data.onMore ? (
        <button
          type="button"
          onClick={data.onMore}
          className="w-full border-t border-border/60 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-accent/60"
        >
          +{data.moreCount} altri
        </button>
      ) : null}
      <Handle type="target" position={Position.Top} id="top" className={hiddenHandle} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  areaRoot: RootNode,
  areaSector: SectorNode,
  areaPanel: PanelNode,
};

function AreaTreeCanvasInner({
  root,
  sectors,
  siteId,
  diagramKey = "kanban",
  initialLayouts,
}: AreaTreeDiagramProps) {
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const layout = useDiagramLayouts({
    siteId,
    diagramKey,
    initial: initialLayouts,
  });
  const { editMode, positionOverrides, positionsRef, onNodesChange } = layout;

  const { nodes, edges, childrenMap } = useMemo(() => {
    const flowNodes: AreaFlowNode[] = [];
    const flowEdges: Edge[] = [];
    const map = new Map<string, string[]>();

    const sectorMeta = sectors.map((sector) => {
      const widths = sector.panels.map(panelWidth);
      const panelsTotal =
        widths.reduce((sum, w) => sum + w, 0) +
        Math.max(0, sector.panels.length - 1) * PANEL_GAP;
      const headerW = sectorHeaderWidth(sector);
      const blockWidth = Math.max(headerW, panelsTotal, SECTOR_MIN);
      return { sector, widths, panelsTotal, headerW, blockWidth };
    });

    const totalWidth =
      sectorMeta.reduce((sum, m) => sum + m.blockWidth, 0) +
      Math.max(0, sectorMeta.length - 1) * GROUP_GAP;

    flowNodes.push({
      id: "area-root",
      type: "areaRoot",
      position: { x: -ROOT_W / 2, y: ROOT_Y },
      data: { ...root, width: ROOT_W },
      width: ROOT_W,
      height: ROOT_H,
    });

    let offsetX = -totalWidth / 2;
    const rootChildren: string[] = [];

    for (const meta of sectorMeta) {
      const { sector, widths, panelsTotal, headerW, blockWidth } = meta;
      const blockCenter = offsetX + blockWidth / 2;
      offsetX += blockWidth + GROUP_GAP;

      const sectorId = `sector-${sector.id}`;
      rootChildren.push(sectorId);
      flowNodes.push({
        id: sectorId,
        type: "areaSector",
        position: { x: blockCenter - headerW / 2, y: SECTOR_Y },
        data: { ...sector, width: headerW },
        width: headerW,
        height: SECTOR_H,
      });
      flowEdges.push({
        id: `e-root-${sectorId}`,
        source: "area-root",
        target: sectorId,
        sourceHandle: "bottom",
        targetHandle: "top",
        type: "smoothstep",
        style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 2 },
      });

      const panelChildren: string[] = [];
      let panelX = blockCenter - panelsTotal / 2;
      sector.panels.forEach((panel, index) => {
        const w = widths[index];
        const panelId = `panel-${sector.id}-${panel.id}`;
        panelChildren.push(panelId);
        flowNodes.push({
          id: panelId,
          type: "areaPanel",
          position: { x: panelX, y: PANEL_Y },
          data: { ...panel, width: w, accentColor: sector.color },
          width: w,
          height: panelContentHeight(panel),
        });
        flowEdges.push({
          id: `e-${sectorId}-${panelId}`,
          source: sectorId,
          target: panelId,
          sourceHandle: "bottom",
          targetHandle: "top",
          type: "smoothstep",
          style: {
            stroke: sector.color ?? "hsl(var(--muted-foreground))",
            strokeWidth: 1.75,
          },
        });
        panelX += w + PANEL_GAP;
      });

      map.set(sectorId, panelChildren);
    }

    map.set("area-root", rootChildren);

    return { nodes: flowNodes, edges: flowEdges, childrenMap: map };
  }, [root, sectors]);

  const displayNodes = useMemo(
    () =>
      nodes.map((node) =>
        positionOverrides[node.id]
          ? { ...node, position: positionOverrides[node.id] }
          : node,
      ),
    [nodes, positionOverrides],
  );

  // Keep the full position map available to the layout-save controller.
  positionsRef.current = Object.fromEntries(
    displayNodes.map((node) => [node.id, node.position]),
  );

  const displayNodesRef = useRef(displayNodes);
  displayNodesRef.current = displayNodes;

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes, displayNodesRef.current, childrenMap);
    },
    [onNodesChange, childrenMap],
  );

  const fitDiagram = useCallback(() => {
    const element = wrapperRef.current;
    if (!element || element.clientWidth === 0 || element.clientHeight === 0) {
      return;
    }
    fitView({ padding: 0.12, duration: 200 });
  }, [fitView]);

  useEffect(() => {
    if (!nodesInitialized || nodes.length === 0) return;
    const frame = requestAnimationFrame(fitDiagram);
    const timeout = window.setTimeout(fitDiagram, 120);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [nodesInitialized, nodes.length, sectors, fitDiagram]);

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
    <DiagramStage variant="full" className="min-h-[480px]" innerRef={wrapperRef}>
      <div className="absolute right-3 top-3 z-20">
        <DiagramEditToolbar controller={layout} />
      </div>
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onInit={() => requestAnimationFrame(fitDiagram)}
        minZoom={0.15}
        maxZoom={2}
        nodesDraggable={editMode}
        nodesConnectable={false}
        elementsSelectable={false}
        selectNodesOnDrag={false}
        nodeDragThreshold={6}
        onNodeClick={() => {}}
        zoomOnScroll
        zoomOnPinch
        panOnDrag
        proOptions={{ hideAttribution: true }}
        className="!bg-transparent"
        style={{ width: "100%", height: "100%" }}
      >
        <Controls
          showInteractive={false}
          position="bottom-right"
          className="!rounded-lg !border !border-border !bg-card !shadow-md [&>button]:!border-b-border [&>button]:!bg-card [&>button]:!text-foreground [&>button:hover]:!bg-accent [&>button>svg]:!fill-current"
        />
      </ReactFlow>
    </DiagramStage>
  );
}

export default function AreaTreeCanvas(props: AreaTreeDiagramProps) {
  if (props.sectors.length === 0) {
    return (
      <DiagramStage variant="full" className="min-h-[480px]">
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Nessun elemento da visualizzare nel diagramma.
          </p>
        </div>
      </DiagramStage>
    );
  }
  return (
    <ReactFlowProvider>
      <AreaTreeCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
