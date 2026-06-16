"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface DiagramAmbientFieldProps {
  count?: number;
  radius?: number;
  color: string;
  accent: string;
}

/**
 * Slow-drifting particle field used as an ambient depth layer behind the 2D
 * diagrams. Mirrors the approach of `components/command-deck/Particles.tsx`
 * but tints points with theme-derived colors so it blends in light and dark.
 */
function ParticleCloud({
  count = 700,
  radius = 18,
  color,
  accent,
}: DiagramAmbientFieldProps) {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const base = new THREE.Color(color);
    const acc = new THREE.Color(accent);
    for (let i = 0; i < count; i++) {
      const r = radius * (0.45 + Math.random() * 0.55);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) * 0.4;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const mixed = base.clone().lerp(acc, Math.random() * 0.6);
      col[i * 3] = mixed.r;
      col[i * 3 + 1] = mixed.g;
      col[i * 3 + 2] = mixed.b;
    }
    return { positions: pos, colors: col };
  }, [count, radius, color, accent]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.012;
    // gentle vertical breathing for depth
    ref.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.15) * 0.3;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default ParticleCloud;
