"use client";

import { forwardRef, type ReactNode } from "react";
import { RoundedBox } from "@react-three/drei";
import type * as THREE from "three";

interface NodeGlyphProps {
  nodeId: string;
  color: string;
  emissiveIntensity: number;
  /** Final opacity multiplier applied on top of the material's own 0.95. */
  opacity: number;
}

/**
 * Per-module mini 3D glyph.
 *
 * Each glyph is built exclusively from cheap built-in primitives
 * (box, sphere, cylinder, torus, capsule, drei's RoundedBox) so we never
 * introduce heavy models or remote assets while still giving each node a
 * recognizable silhouette.
 *
 * The forwarded ref is attached to the outer group so the host component
 * can rotate the whole glyph uniformly without having to know its
 * internal composition.
 */
export const NodeGlyph = forwardRef<THREE.Group, NodeGlyphProps>(
  function NodeGlyph({ nodeId, color, emissiveIntensity, opacity }, ref) {
    const material = (key: string) => (
      <meshStandardMaterial
        key={key}
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        metalness={0.35}
        roughness={0.4}
        transparent
        opacity={0.95 * opacity}
      />
    );

    let body: ReactNode;

    switch (nodeId) {
      case "fabbrica":
        // Mini industrial block: two rectangular volumes at different heights
        // + a thin chimney on top of the taller one.
        body = (
          <>
            <mesh position={[-0.26, -0.1, 0]}>
              <boxGeometry args={[0.42, 0.62, 0.42]} />
              {material("m1")}
            </mesh>
            <mesh position={[0.22, -0.2, 0]}>
              <boxGeometry args={[0.52, 0.42, 0.52]} />
              {material("m2")}
            </mesh>
            <mesh position={[-0.26, 0.28, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.24, 10]} />
              {material("m3")}
            </mesh>
          </>
        );
        break;

      case "clienti":
        // Triangle of three stylized "people" (orbs on capsule stems are
        // too heavy; three spheres work better at this scale).
        body = (
          <>
            <mesh position={[0, 0.22, 0]}>
              <sphereGeometry args={[0.24, 18, 14]} />
              {material("c1")}
            </mesh>
            <mesh position={[-0.28, -0.12, 0]}>
              <sphereGeometry args={[0.22, 18, 14]} />
              {material("c2")}
            </mesh>
            <mesh position={[0.28, -0.12, 0]}>
              <sphereGeometry args={[0.22, 18, 14]} />
              {material("c3")}
            </mesh>
          </>
        );
        break;

      case "fornitori":
        // Loading platform: a flat plate with a box on top and a small
        // torus on the side hinting at a wheel / logistics flow.
        body = (
          <>
            <mesh position={[0, -0.22, 0]}>
              <cylinderGeometry args={[0.48, 0.48, 0.1, 20]} />
              {material("f1")}
            </mesh>
            <mesh position={[-0.05, 0.04, 0]}>
              <boxGeometry args={[0.46, 0.36, 0.42]} />
              {material("f2")}
            </mesh>
            <mesh
              position={[0.44, -0.14, 0]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <torusGeometry args={[0.11, 0.035, 8, 14]} />
              {material("f3")}
            </mesh>
          </>
        );
        break;

      case "prodotti":
        // Single chamfered cube (premium package), with a thin band across
        // the equator to read as a wrapped parcel.
        body = (
          <>
            <RoundedBox args={[0.72, 0.72, 0.72]} radius={0.08} smoothness={3}>
              {material("p1")}
            </RoundedBox>
            <mesh>
              <boxGeometry args={[0.74, 0.06, 0.74]} />
              {material("p2")}
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.74, 0.06, 0.74]} />
              {material("p3")}
            </mesh>
          </>
        );
        break;

      case "progetti":
        // Blueprint slab: a flat rounded panel with a small tab sticking out
        // and a thin accent line across the front, evocative of a project
        // folder / blueprint sheet.
        body = (
          <>
            <RoundedBox args={[0.95, 0.65, 0.1]} radius={0.06} smoothness={3}>
              {material("pr1")}
            </RoundedBox>
            <mesh position={[-0.28, 0.38, 0]}>
              <boxGeometry args={[0.26, 0.08, 0.1]} />
              {material("pr2")}
            </mesh>
            <mesh position={[0, -0.06, 0.06]}>
              <boxGeometry args={[0.68, 0.03, 0.01]} />
              {material("pr3")}
            </mesh>
          </>
        );
        break;

      case "inventario":
        // Stack of three plates (decreasing radius) — clean "storage" motif.
        body = (
          <>
            <mesh position={[0, -0.26, 0]}>
              <cylinderGeometry args={[0.55, 0.55, 0.1, 24]} />
              {material("i1")}
            </mesh>
            <mesh position={[0, -0.08, 0]}>
              <cylinderGeometry args={[0.46, 0.46, 0.1, 24]} />
              {material("i2")}
            </mesh>
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.37, 0.37, 0.1, 24]} />
              {material("i3")}
            </mesh>
          </>
        );
        break;

      case "admin":
        // Control tower: wide base + thin shaft + cap cube, suggesting a
        // control plane / command structure rather than a mechanical gear.
        body = (
          <>
            <mesh position={[0, -0.32, 0]}>
              <cylinderGeometry args={[0.42, 0.46, 0.15, 24]} />
              {material("a1")}
            </mesh>
            <mesh position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.13, 0.13, 0.55, 18]} />
              {material("a2")}
            </mesh>
            <mesh position={[0, 0.38, 0]}>
              <boxGeometry args={[0.44, 0.22, 0.44]} />
              {material("a3")}
            </mesh>
          </>
        );
        break;

      default:
        body = (
          <mesh>
            <sphereGeometry args={[0.42, 18, 14]} />
            {material("fallback")}
          </mesh>
        );
    }

    return <group ref={ref}>{body}</group>;
  },
);
