"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";
import type { CommandDeckNode } from "./nodes";
import { USER_NODE_POSITION } from "./nodes";

interface ConnectionsProps {
  nodes: CommandDeckNode[];
  selectedId: string | null;
  hoveredId: string | null;
  /** True when the central user node is the interaction target. */
  userActive: boolean;
}

/**
 * Renders connections from the central user node to every external module.
 *
 * - Idle: thin, cool-slate line (~30% opacity)
 * - When the user node is active (hovered or in galaxy home): all spokes
 *   brighten together with a neutral cyan tint, emphasizing the "hub" feel.
 * - When a specific module is active: its spoke adopts that module's color
 *   and thickens, while the others dim out.
 */
export function Connections({
  nodes,
  selectedId,
  hoveredId,
  userActive,
}: ConnectionsProps) {
  const edges = useMemo(
    () =>
      nodes.map((n) => ({
        id: `user-${n.id}`,
        to: n,
      })),
    [nodes],
  );

  const activeId = hoveredId ?? selectedId;

  return (
    <group>
      {edges.map(({ id, to }) => {
        const isModuleActive = activeId === to.id;
        const isDimmed = activeId !== null && !isModuleActive;

        const idleColor = userActive ? "#7dd3fc" : "#3a4b66";
        const idleOpacity = userActive ? 0.5 : 0.3;
        const idleWidth = 0.7;

        const color = isModuleActive ? to.color : idleColor;
        const opacity = isModuleActive
          ? 0.9
          : isDimmed
            ? 0.14
            : idleOpacity;
        const lineWidth = isModuleActive ? 1.4 : idleWidth;

        return (
          <Line
            key={id}
            points={[USER_NODE_POSITION, to.position]}
            color={color}
            opacity={opacity}
            transparent
            lineWidth={lineWidth}
            dashed={false}
          />
        );
      })}
    </group>
  );
}
