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
import { cn } from "@/lib/utils";
import { getModuleFaIcon } from "@/lib/module-fa-icons";
import { getKanbanIcon } from "@/lib/kanban-icons";
import { DiagramStage } from "@/components/diagram/diagram-stage";
import { DiagramEditToolbar } from "@/components/diagram/diagram-edit-toolbar";
import { DiagramRefreshButton } from "@/components/diagram/diagram-refresh-button";
import { useDiagramLayouts } from "@/components/diagram/use-diagram-layouts";
import type { DiagramKey } from "@/lib/diagram-layouts";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export interface FocusDiagramRoot extends Record<string, unknown> {
  label: string;
  sublabel?: string;
  /** FontAwesome icon name (module config style). */
  icon?: string;
  color?: string;
}

export interface FocusDiagramChild extends Record<string, unknown> {
  id: string;
  label: string;
  badge?: string;
  color?: string;
  /** Lucide icon name (kanban icon library). */
  icon?: string;
  /** FontAwesome icon name when lucide icon is absent. */
  faIcon?: string;
  avatar?: {
    initials: string;
    imageUrl?: string | null;
    color?: string | null;
  };
  hasChildren?: boolean;
  onClick?: () => void;
}

export interface FocusDiagramProps {
  root: FocusDiagramRoot;
  items: FocusDiagramChild[];
  className?: string;
  siteId?: string;
  diagramKey?: DiagramKey | string;
}

const ROOT_W = 168;
const ROOT_Y = 0;
const CHILD_W = 190;
const CHILD_H = 46;
const CHILD_GAP = 14;
const CHILD_Y = 210;

const hiddenHandle =
  "!h-1.5 !w-1.5 !min-h-0 !min-w-0 !border-0 !bg-transparent";

type RootData = FocusDiagramRoot;
type ChildData = FocusDiagramChild;

type RootFlowNode = Node<RootData, "focusRoot">;
type ChildFlowNode = Node<ChildData, "focusChild">;
type FocusFlowNode = RootFlowNode | ChildFlowNode;

function RootNode({ data }: NodeProps<RootFlowNode>) {
  const moduleIcon = data.icon ? getModuleFaIcon(data.icon) : null;
  return (
    <div
      className="flex flex-col items-center gap-2"
      style={{ width: ROOT_W }}
    >
      <div
        className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-primary bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/30"
        aria-label={data.label}
        style={data.color ? { borderColor: data.color, backgroundColor: data.color } : undefined}
      >
        {moduleIcon ? (
          <FontAwesomeIcon icon={moduleIcon} style={{ fontSize: "2.75rem" }} />
        ) : (
          <span className="text-3xl font-bold">{data.label.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <div className="text-center">
        <p className="diagram-node-floating-label text-base font-semibold">
          {data.label}
        </p>
        {data.sublabel ? (
          <p className="diagram-node-floating-label-muted text-sm">
            {data.sublabel}
          </p>
        ) : null}
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

function ChildNode({ data }: NodeProps<ChildFlowNode>) {
  const interactive = Boolean(data.onClick);
  const Wrapper = interactive ? "button" : "div";
  const KanbanIcon = data.icon ? getKanbanIcon(data.icon) : null;
  const faIcon = data.faIcon ? getModuleFaIcon(data.faIcon) : null;

  return (
    <Wrapper
      type={interactive ? "button" : undefined}
      onClick={data.onClick}
      aria-label={interactive ? `Apri ${data.label}` : undefined}
      className={cn(
        "diagram-node-surface flex items-center gap-2.5 border-[3px] px-3 py-2 text-sm font-medium rounded-md",
        interactive &&
          "cursor-pointer transition-colors hover:brightness-110",
      )}
      style={{
        width: CHILD_W,
        backgroundColor: "#000000",
        ...(data.color ? { borderColor: data.color } : {}),
      }}
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
      ) : faIcon ? (
        <FontAwesomeIcon
          icon={faIcon as IconDefinition}
          className="h-4 w-4 shrink-0 text-primary"
          style={data.color ? { color: data.color } : undefined}
        />
      ) : data.color ? (
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: data.color }}
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate text-left">{data.label}</span>
      {data.badge !== undefined ? (
        <span className="shrink-0 rounded-full bg-muted px-1.5 text-xs font-semibold text-foreground">
          {data.badge}
        </span>
      ) : null}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={hiddenHandle}
      />
    </Wrapper>
  );
}

const nodeTypes: NodeTypes = {
  focusRoot: RootNode,
  focusChild: ChildNode,
};

function FocusDiagramInner({
  root,
  items,
  siteId,
  diagramKey = "clients",
}: FocusDiagramProps) {
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const layout = useDiagramLayouts({ siteId, diagramKey });
  const { editMode, positionOverrides, positionsRef, onNodesChange, resetDiagram, setEditMode } =
    layout;

  const { nodes, edges, childrenMap } = useMemo(() => {
    const flowNodes: FocusFlowNode[] = [];
    const flowEdges: Edge[] = [];
    const map = new Map<string, string[]>();

    const totalWidth =
      items.length * CHILD_W + Math.max(0, items.length - 1) * CHILD_GAP;
    const startX = -totalWidth / 2;

    flowNodes.push({
      id: "focus-root",
      type: "focusRoot",
      position: { x: -ROOT_W / 2, y: ROOT_Y },
      data: root,
    });

    const rootChildren: string[] = [];
    items.forEach((child, index) => {
      const childId = `focus-child-${child.id}`;
      rootChildren.push(childId);
      const x = startX + index * (CHILD_W + CHILD_GAP);
      flowNodes.push({
        id: childId,
        type: "focusChild",
        position: { x, y: CHILD_Y },
        data: child,
      });
      flowEdges.push({
        id: `e-root-${childId}`,
        source: "focus-root",
        target: childId,
        sourceHandle: "bottom",
        targetHandle: "top",
        type: "smoothstep",
        style: {
          stroke: "rgba(190, 225, 255, 0.55)",
          strokeWidth: 2,
        },
      });
    });
    map.set("focus-root", rootChildren);

    return { nodes: flowNodes, edges: flowEdges, childrenMap: map };
  }, [root, items]);

  const displayNodes = useMemo(
    () =>
      nodes.map((node) =>
        positionOverrides[node.id]
          ? { ...node, position: positionOverrides[node.id] }
          : node,
      ),
    [nodes, positionOverrides],
  );

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
    fitView({ padding: 0.15, duration: 200 });
  }, [fitView]);

  const handleRefresh = useCallback(() => {
    setEditMode(false);
    resetDiagram();
    requestAnimationFrame(fitDiagram);
    window.setTimeout(fitDiagram, 150);
    window.setTimeout(fitDiagram, 450);
  }, [fitDiagram, resetDiagram, setEditMode]);

  useEffect(() => {
    if (!nodesInitialized || nodes.length === 0) return;
    const frame = requestAnimationFrame(fitDiagram);
    const timeout = window.setTimeout(fitDiagram, 120);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [nodesInitialized, nodes.length, items.length, fitDiagram]);

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
      <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
        <DiagramEditToolbar controller={layout} />
        <DiagramRefreshButton onRefresh={handleRefresh} />
      </div>
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onInit={() => requestAnimationFrame(fitDiagram)}
        minZoom={0.2}
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
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <Controls
          showInteractive={false}
          position="bottom-right"
          className="diagram-stage-chrome !rounded-lg !border !shadow-md [&>button]:!border-b-border [&>button]:!bg-transparent [&>button]:!text-inherit [&>button:hover]:!brightness-105 [&>button>svg]:!fill-current"
        />
      </ReactFlow>
    </DiagramStage>
  );
}

export default function FocusDiagram(props: FocusDiagramProps) {
  return (
    <ReactFlowProvider>
      <FocusDiagramInner {...props} />
    </ReactFlowProvider>
  );
}
