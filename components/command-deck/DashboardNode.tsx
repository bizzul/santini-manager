"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import type { CommandDeckNode } from "./nodes";
import { NodeGlyph } from "./NodeGlyph";
import { NotificationCloud } from "./NotificationCloud";

interface DashboardNodeProps {
  node: CommandDeckNode;
  isSelected: boolean;
  isHovered: boolean;
  anyActive: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onDoubleClick?: (id: string) => void;
  /** Seed to vary idle floating phase per node. */
  seed: number;
}

/**
 * A single dashboard node in the 3D space (V2.3).
 *
 * Composition:
 *  - `<NodeGlyph>` — per-module mini 3D scene (2 to 4 primitives).
 *  - A billboarded halo ring that tightens and brightens when active.
 *  - A floating `<NotificationCloud>` above the node (framer-motion bob).
 *  - A secondary Html label below the node (name + subtitle; idle name is
 *    discreet, becomes a prominent pill on hover/selected).
 *
 * Animation & feedback:
 *  - The group bobs slightly on Y (seed-based phase).
 *  - The inner glyph rotates slowly (`glyphRef`).
 *  - Hover lifts scale to 1.12 and boosts emissive; selection goes further
 *    to 1.2 with a pulsing halo.
 */
export function DashboardNode({
  node,
  isSelected,
  isHovered,
  anyActive,
  onHover,
  onSelect,
  onDoubleClick,
  seed,
}: DashboardNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glyphRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    // Floating bob — slightly stronger than V2.1 to add life.
    groupRef.current.position.y =
      node.position[1] + Math.sin(t * 0.85 + seed) * 0.09;

    // Glyph slow rotation.
    if (glyphRef.current) {
      glyphRef.current.rotation.y += 0.0035;
    }

    // Pulse the halo on the selected node for a subtle "heartbeat".
    if (haloRef.current && isSelected) {
      const s = 1 + Math.sin(t * 1.6) * 0.035;
      haloRef.current.scale.set(s, s, 1);
    } else if (haloRef.current) {
      haloRef.current.scale.set(1, 1, 1);
    }
  });

  const active = isSelected || isHovered;
  const scale = isSelected ? 1.2 : isHovered ? 1.12 : 1;
  const emissiveIntensity = isSelected ? 1.3 : isHovered ? 0.95 : 0.38;
  // Dim non-focused nodes when any node (or the user node) is active so the
  // active one reads clearly against the rest of the constellation.
  const dim = anyActive && !isHovered && !isSelected ? 0.55 : 1;

  return (
    <group
      ref={groupRef}
      position={node.position}
      scale={scale}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(node.id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(null);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onDoubleClick={
        onDoubleClick
          ? (e) => {
              e.stopPropagation();
              onDoubleClick(node.id);
            }
          : undefined
      }
    >
      {/* Mini 3D glyph — the actual visual identity of the node */}
      <NodeGlyph
        ref={glyphRef}
        nodeId={node.id}
        color={node.color}
        emissiveIntensity={emissiveIntensity}
        opacity={dim}
      />

      {/* Halo ring — always billboarded, tightens and brightens when active */}
      <Billboard>
        <mesh ref={haloRef}>
          <ringGeometry args={[0.88, 0.96, 48]} />
          <meshBasicMaterial
            color={node.color}
            transparent
            opacity={active ? 0.7 : 0.18 * dim}
            depthWrite={false}
          />
        </mesh>
      </Billboard>

      {/* Notification cloud — above the node */}
      <Billboard position={[0, 1.25, 0]}>
        <Html
          center
          distanceFactor={8.5}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <NotificationCloud
            notification={node.notification}
            color={node.color}
            active={active}
            dim={dim}
            phase={(seed * 0.3) % 2.5}
          />
        </Html>
      </Billboard>

      {/* Label below — secondary by default, prominent on hover/selected */}
      <Billboard position={[0, -1.05, 0]}>
        <Html
          center
          distanceFactor={8.5}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <NodeLabel
            active={active}
            label={node.label}
            subtitle={node.subtitle}
            color={node.color}
            dim={dim}
          />
        </Html>
      </Billboard>
    </group>
  );
}

function NodeLabel({
  active,
  label,
  subtitle,
  color,
  dim,
}: {
  active: boolean;
  label: string;
  subtitle: string;
  color: string;
  dim: number;
}) {
  return (
    <div
      className="flex flex-col items-center"
      style={{ fontFamily: "inherit", opacity: dim }}
    >
      {/* Idle: dot + readable name */}
      <div
        style={{
          opacity: active ? 0 : 1,
          position: active ? "absolute" : "static",
          transform: active ? "translateY(4px)" : "translateY(0)",
          transition: "opacity 180ms ease, transform 180ms ease",
        }}
        className="flex flex-col items-center gap-2"
      >
        <span
          className="block h-3 w-3 rounded-full"
          style={{
            background: color,
            boxShadow: `0 0 10px ${color}aa`,
          }}
        />
        <span
          className="text-[26px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: `${color}dd` }}
        >
          {label}
        </span>
      </div>

      {/* Active: full label card */}
      <div
        style={{
          opacity: active ? 1 : 0,
          position: active ? "static" : "absolute",
          transform: active ? "translateY(0)" : "translateY(4px)",
          transition: "opacity 200ms ease, transform 200ms ease",
        }}
        className="flex flex-col items-center"
      >
        <div
          className="rounded-full border px-5 py-2.5 text-[26px] font-semibold uppercase tracking-[0.2em]"
          style={{
            color,
            borderColor: `${color}77`,
            // 50% transparent glass to match the notification cloud.
            background: "rgba(6, 10, 20, 0.5)",
            backdropFilter: "blur(8px)",
            boxShadow: `0 0 18px ${color}33`,
          }}
        >
          {label}
        </div>
        <div
          className="mt-2 text-[22px] tracking-[0.24em] uppercase"
          style={{ color: "rgba(226, 232, 240, 0.78)" }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}
