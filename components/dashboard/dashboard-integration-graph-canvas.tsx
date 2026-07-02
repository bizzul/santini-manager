"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
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
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { DiagramStage } from "@/components/diagram/diagram-stage";

export interface OperationalDashboardNode {
  id: string;
  label: string;
  href: string;
  color?: string;
}

export interface CountryDashboardNode {
  iso2: string;
  iso3: string;
  name: string;
}

export interface DashboardIntegrationGraphProps {
  domain: string;
  hubLabel: string;
  operational: OperationalDashboardNode[];
  countries: CountryDashboardNode[];
}

const hiddenHandle =
  "!h-1.5 !w-1.5 !min-h-0 !min-w-0 !border-0 !bg-transparent";

const HUB = 150;
const PILL_W = 184;
const PILL_H = 46;

type HubData = { label: string; onClick?: () => void };
type PillData = {
  label: string;
  color?: string;
  flagIso2?: string;
  onClick?: () => void;
};

type HubFlowNode = Node<HubData, "hub">;
type PillFlowNode = Node<PillData, "pill">;

const SIDES: Array<{ id: string; position: Position }> = [
  { id: "t", position: Position.Top },
  { id: "r", position: Position.Right },
  { id: "b", position: Position.Bottom },
  { id: "l", position: Position.Left },
];

function HubNode({ data }: NodeProps<HubFlowNode>) {
  return (
    <div className="flex flex-col items-center gap-2" style={{ width: HUB }}>
      <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-primary bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/30">
        <LayoutDashboard className="h-12 w-12" />
      </div>
      <p className="diagram-node-floating-label text-base font-semibold">
        {data.label}
      </p>
      {SIDES.map((side) => (
        <Handle
          key={side.id}
          type="source"
          id={side.id}
          position={side.position}
          className={hiddenHandle}
        />
      ))}
    </div>
  );
}

function PillNode({ data }: NodeProps<PillFlowNode>) {
  const interactive = Boolean(data.onClick);
  const Wrapper = interactive ? "button" : "div";
  return (
    <Wrapper
      type={interactive ? "button" : undefined}
      onClick={data.onClick}
      aria-label={interactive ? `Apri ${data.label}` : undefined}
      className={cn(
        "diagram-node-surface flex items-center gap-2.5 border-[3px] px-3 py-2 text-sm font-medium rounded-md",
        interactive && "cursor-pointer transition-colors hover:brightness-110",
      )}
      style={{
        width: PILL_W,
        backgroundColor: "#000000",
        ...(data.color ? { borderColor: data.color } : {}),
      }}
    >
      {data.flagIso2 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://flagcdn.com/w40/${data.flagIso2.toLowerCase()}.png`}
          alt=""
          className="h-4 w-6 shrink-0 rounded-sm object-cover"
        />
      ) : data.color ? (
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: data.color }}
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate text-left">{data.label}</span>
      {SIDES.map((side) => (
        <Handle
          key={side.id}
          type="target"
          id={side.id}
          position={side.position}
          className={hiddenHandle}
        />
      ))}
    </Wrapper>
  );
}

const nodeTypes: NodeTypes = {
  hub: HubNode,
  pill: PillNode,
};

/** Choose hub/source and node/target handles based on relative direction. */
function pickHandles(dx: number, dy: number): { s: string; t: string } {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { s: "r", t: "l" } : { s: "l", t: "r" };
  }
  return dy >= 0 ? { s: "b", t: "t" } : { s: "t", t: "b" };
}

function GraphInner({
  domain,
  hubLabel,
  operational,
  countries,
}: DashboardIntegrationGraphProps) {
  const router = useRouter();
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { nodes, edges } = useMemo(() => {
    const flowNodes: Array<HubFlowNode | PillFlowNode> = [];
    const flowEdges: Edge[] = [];

    flowNodes.push({
      id: "hub",
      type: "hub",
      position: { x: -HUB / 2, y: -HUB / 2 },
      data: { label: hubLabel },
    });

    const ring = (
      items: Array<{ id: string; data: PillData }>,
      radius: number,
      startAngleDeg: number,
    ) => {
      const n = items.length;
      items.forEach((item, i) => {
        const angle = ((startAngleDeg + (360 / Math.max(1, n)) * i) * Math.PI) / 180;
        const cx = radius * Math.cos(angle);
        const cy = radius * Math.sin(angle);
        flowNodes.push({
          id: item.id,
          type: "pill",
          position: { x: cx - PILL_W / 2, y: cy - PILL_H / 2 },
          data: item.data,
        });
        const { s, t } = pickHandles(cx, cy);
        flowEdges.push({
          id: `e-${item.id}`,
          source: "hub",
          target: item.id,
          sourceHandle: s,
          targetHandle: t,
          type: "smoothstep",
          style: { stroke: "rgba(190, 225, 255, 0.45)", strokeWidth: 1.5 },
        });
      });
    };

    const innerRadius = Math.max(280, operational.length * 34);
    const outerRadius = Math.max(innerRadius + 220, countries.length * 30);

    ring(
      operational.map((op) => ({
        id: `op-${op.id}`,
        data: {
          label: op.label,
          color: op.color,
          onClick: () => router.push(op.href),
        } as PillData,
      })),
      innerRadius,
      -90,
    );

    ring(
      countries.map((c) => ({
        id: `co-${c.iso2}`,
        data: {
          label: c.name,
          flagIso2: c.iso2,
          onClick: () =>
            router.push(`/sites/${domain}/dashboard?country=${c.iso2}`),
        } as PillData,
      })),
      outerRadius,
      -90 + 180 / Math.max(1, countries.length),
    );

    return { nodes: flowNodes, edges: flowEdges };
  }, [domain, hubLabel, operational, countries, router]);

  const fitDiagram = useCallback(() => {
    const el = wrapperRef.current;
    if (!el || el.clientWidth === 0 || el.clientHeight === 0) return;
    fitView({ padding: 0.15, duration: 200 });
  }, [fitView]);

  useEffect(() => {
    if (!nodesInitialized || nodes.length === 0) return;
    const frame = requestAnimationFrame(fitDiagram);
    const timeout = window.setTimeout(fitDiagram, 120);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [nodesInitialized, nodes.length, fitDiagram]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let timeout: number | undefined;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        if (nodesInitialized) fitDiagram();
      }, 120);
    });
    observer.observe(el);
    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, [fitDiagram, nodesInitialized]);

  return (
    <DiagramStage variant="full" className="min-h-[520px]" innerRef={wrapperRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={() => requestAnimationFrame(fitDiagram)}
        minZoom={0.15}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
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

export default function DashboardIntegrationGraphCanvas(
  props: DashboardIntegrationGraphProps,
) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}
