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
import {
  buildOrbitSet,
  resolveActiveOrbitItems,
  type DrillState,
  type ModuleDrillGroups,
  type OrbitGroups,
  type OrbitItem,
} from "./orbit-items";

export type CommandDeckMode = "galaxy" | "focus";
export type CommandDeckSceneVariant = "modules" | "activities";

interface CommandDeckSceneProps {
  selectedId: string | null;
  hoveredId: string | null;
  mode: CommandDeckMode;
  userName: string;
  userSubtitle?: string;
  userAvatarUrl?: string | null;
  userHovered: boolean;
  orbitGroups: OrbitGroups;
  drillGroups?: ModuleDrillGroups;
  drill?: DrillState;
  selectedOrbitItemId?: string | null;
  sceneVariant?: CommandDeckSceneVariant;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onNodeDoubleClick?: (id: string) => void;
  onOrbitItemClick?: (item: OrbitItem) => void;
  onOrbitItemDoubleClick?: (item: OrbitItem) => void;
  onUserHover: (hovered: boolean) => void;
  onUserClick: () => void;
  onBackgroundClick: () => void;
}

function CameraRig({
  mode,
  selected,
  sceneVariant,
  focusOnUser,
}: {
  mode: CommandDeckMode;
  selected: CommandDeckNode | null;
  sceneVariant: CommandDeckSceneVariant;
  focusOnUser: boolean;
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

    if (sceneVariant === "activities") {
      if (mode === "focus" && focusOnUser) {
        targetPos.current.set(0, 1.8, 6.5);
        lookAt.current.set(0, 0.15, 0);
      } else {
        targetPos.current.set(
          Math.sin(t * 0.05) * 0.3,
          3.2 + Math.sin(t * 0.2) * 0.1,
          11,
        );
        lookAt.current.set(0, 0.15, 0);
      }
    } else if (mode === "focus" && selected) {
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
  drillGroups = {},
  drill = {},
  selectedOrbitItemId = null,
  sceneVariant = "modules",
  onHover,
  onSelect,
  onNodeDoubleClick,
  onOrbitItemClick,
  onOrbitItemDoubleClick,
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

  const anyActive =
    selectedId !== null ||
    hoveredId !== null ||
    userHovered ||
    selectedOrbitItemId !== null;

  const activeOrbitSet = useMemo(() => {
    if (sceneVariant === "activities") {
      return orbitGroups.activities ?? {
        items: [],
        total: 0,
        truncated: false,
        isDemo: false,
      };
    }
    if (!selectedId) {
      return { items: [], total: 0, truncated: false, isDemo: false };
    }
    const items = resolveActiveOrbitItems(
      selectedId,
      drill,
      orbitGroups,
      drillGroups,
    );
    return buildOrbitSet(items);
  }, [sceneVariant, selectedId, drill, orbitGroups, drillGroups]);

  const orbitCenter: [number, number, number] =
    sceneVariant === "activities"
      ? USER_NODE_POSITION
      : selected
        ? selected.position
        : USER_NODE_POSITION;

  const orbitRadius = sceneVariant === "activities" ? 2.6 : 1.4;
  const orbitInnerRadius = sceneVariant === "activities" ? 1.05 : 1.15;
  const orbitColor =
    sceneVariant === "activities"
      ? "#7dd3fc"
      : selected?.color ?? "#7dd3fc";

  const showOrbitRing =
    sceneVariant === "activities" ||
    (selectedId !== null && activeOrbitSet.items.length > 0);

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
      <CameraRig
        mode={mode}
        selected={selected}
        sceneVariant={sceneVariant}
        focusOnUser={sceneVariant === "activities" && selectedOrbitItemId !== null}
      />

      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 8, 4]} intensity={0.9} color="#cbd5f5" />
      <pointLight position={[-6, -4, 2]} intensity={0.8} color="#7c3aed" />
      <pointLight position={[6, -2, -6]} intensity={0.65} color="#22d3ee" />

      <Particles count={550} />

      {sceneVariant === "modules" && (
        <>
          <Connections
            nodes={COMMAND_DECK_NODES}
            selectedId={selectedId}
            hoveredId={hoveredId}
            userActive={
              userHovered || (selectedId === null && mode === "galaxy")
            }
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
        </>
      )}

      <UserNode
        name={userName}
        subtitle={userSubtitle}
        avatarUrl={userAvatarUrl}
        isActive={
          userHovered ||
          (sceneVariant === "activities"
            ? selectedOrbitItemId === null && mode === "galaxy"
            : selectedId === null && mode === "galaxy")
        }
        anyActive={anyActive}
        onHover={onUserHover}
        onClick={onUserClick}
      />

      {showOrbitRing && (
        <OrbitRing
          center={orbitCenter}
          innerRadius={orbitInnerRadius}
          radius={orbitRadius}
          badgePx={sceneVariant === "activities" ? 28 : 26}
          parentColor={orbitColor}
          orbit={activeOrbitSet}
          visible
          selectedOrbitItemId={selectedOrbitItemId}
          onItemClick={onOrbitItemClick}
          onItemDoubleClick={onOrbitItemDoubleClick}
        />
      )}
    </Canvas>
  );
}

export default CommandDeckScene;
