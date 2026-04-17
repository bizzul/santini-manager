"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import {
  COMMAND_DECK_NODES,
  USER_NODE_POSITION,
  type CommandDeckNode,
} from "./nodes";
import { DashboardNode } from "./DashboardNode";
import { UserNode } from "./UserNode";
import { Connections } from "./Connections";
import { Particles } from "./Particles";
import { OrbitRing } from "./OrbitRing";
import type { OrbitGroups } from "./orbit-items";

export type CommandDeckMode = "galaxy" | "focus";

interface CommandDeckSceneProps {
  selectedId: string | null;
  hoveredId: string | null;
  mode: CommandDeckMode;
  userName: string;
  userSubtitle?: string;
  userAvatarUrl?: string | null;
  userHovered: boolean;
  /** Per-node orbit data (real or demo-fallback). */
  orbitGroups: OrbitGroups;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  /** Optional power-user shortcut: double-click a node to navigate. */
  onNodeDoubleClick?: (id: string) => void;
  onUserHover: (hovered: boolean) => void;
  onUserClick: () => void;
  onBackgroundClick: () => void;
}

/**
 * Smoothly moves the camera between a wide "galaxy" home and a "focus" zoom
 * on the selected module. Galaxy framing is centered on the user node.
 */
function CameraRig({
  mode,
  selected,
}: {
  mode: CommandDeckMode;
  selected: CommandDeckNode | null;
}) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 3.4, 12));
  const lookAt = useRef(
    new THREE.Vector3(
      USER_NODE_POSITION[0],
      USER_NODE_POSITION[1],
      USER_NODE_POSITION[2],
    ),
  );

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    if (mode === "focus" && selected) {
      const [x, y, z] = selected.position;
      targetPos.current.set(x * 0.7, y + 1.4, z + 4.4);
      lookAt.current.set(x, y, z);
    } else {
      const orbitRadius = 0.45;
      targetPos.current.set(
        Math.sin(t * 0.06) * orbitRadius,
        3.4 + Math.sin(t * 0.22) * 0.12,
        12 + Math.cos(t * 0.06) * orbitRadius,
      );
      lookAt.current.set(0, 0.15, 0);
    }

    const lerp = Math.min(1, delta * 1.9);
    camera.position.lerp(targetPos.current, lerp);

    const currentDir = new THREE.Vector3();
    camera.getWorldDirection(currentDir);
    const desiredDir = lookAt.current.clone().sub(camera.position).normalize();
    const blended = currentDir.lerp(desiredDir, lerp);
    camera.lookAt(camera.position.clone().add(blended));
  });

  return null;
}

export function CommandDeckScene({
  selectedId,
  hoveredId,
  mode,
  userName,
  userSubtitle,
  userAvatarUrl,
  userHovered,
  orbitGroups,
  onHover,
  onSelect,
  onNodeDoubleClick,
  onUserHover,
  onUserClick,
  onBackgroundClick,
}: CommandDeckSceneProps) {
  const selected = useMemo(
    () =>
      selectedId
        ? COMMAND_DECK_NODES.find((n) => n.id === selectedId) ?? null
        : null,
    [selectedId],
  );

  const anyActive = selectedId !== null || hoveredId !== null || userHovered;

  // Reset body cursor on unmount so we never leave a stuck pointer.
  useEffect(() => {
    return () => {
      document.body.style.cursor = "auto";
    };
  }, []);

  return (
    <Canvas
      className="!h-full !w-full"
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => onBackgroundClick()}
    >
      <color attach="background" args={["#05080f"]} />
      <fog attach="fog" args={["#05080f", 14, 32]} />

      <PerspectiveCamera makeDefault position={[0, 3.4, 12]} fov={44} />
      <CameraRig mode={mode} selected={selected} />

      {/* Keep lighting cheap: ambient + 1 directional + 2 colored point lights
          are enough to read the shapes. We deliberately skip drei's
          <Environment> here to avoid the remote HDR download and keep the
          canvas lightweight. */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 8, 4]} intensity={0.9} color="#cbd5f5" />
      <pointLight position={[-6, -4, 2]} intensity={0.8} color="#7c3aed" />
      <pointLight position={[6, -2, -6]} intensity={0.65} color="#22d3ee" />

      <Particles count={550} />

      <Connections
        nodes={COMMAND_DECK_NODES}
        selectedId={selectedId}
        hoveredId={hoveredId}
        userActive={userHovered || (selectedId === null && mode === "galaxy")}
      />

      <UserNode
        name={userName}
        subtitle={userSubtitle}
        avatarUrl={userAvatarUrl}
        isActive={userHovered || (selectedId === null && mode === "galaxy")}
        anyActive={anyActive}
        onHover={onUserHover}
        onClick={onUserClick}
      />

      {COMMAND_DECK_NODES.map((node, idx) => (
        <DashboardNode
          key={node.id}
          node={node}
          isSelected={selectedId === node.id}
          isHovered={hoveredId === node.id}
          anyActive={anyActive}
          onHover={onHover}
          onSelect={onSelect}
          onDoubleClick={onNodeDoubleClick}
          seed={idx * 1.37}
        />
      ))}

      {/* Orbit ring — only for the currently selected node.
          - center: the selected node's configured world position (no bob)
          - radius: hugs the node's halo; the selected node scales to 1.2,
                    so halo outer ≈ 0.96 * 1.2 = 1.152; we add breathing
                    room and sit at 1.4 which reads as "on the circumference"
                    without colliding with the node chip.
          - badgePx: small enough to read as ~1/10 of the main disc at
                     focus zoom but still legible for initials/images. */}
      {selected && orbitGroups[selected.id] && (
        <OrbitRing
          center={selected.position}
          // `innerRadius` = halo outer radius (0.96) × selected scale (1.2)
          // so the spokes appear to sprout exactly from the main circle's rim.
          innerRadius={1.15}
          radius={1.4}
          badgePx={26}
          parentColor={selected.color}
          orbit={orbitGroups[selected.id]}
          visible
        />
      )}
    </Canvas>
  );
}

export default CommandDeckScene;
