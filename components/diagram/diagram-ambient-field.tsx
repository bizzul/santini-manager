"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface DiagramAmbientFieldProps {
  count?: number;
}

/**
 * Deep-space particle field: drifting stars and nebula dust behind the 2D
 * diagram. Complements the CSS + 2D canvas galactic backdrop.
 */
function ParticleCloud({ count = 1400 }: DiagramAmbientFieldProps) {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const white = new THREE.Color("#ffffff");
    const pale = new THREE.Color("#a8d8ff");
    const cyan = new THREE.Color("#55e0ff");

    for (let i = 0; i < count; i++) {
      const inBand = Math.random() < 0.42;
      const x = (Math.random() - 0.5) * 36;
      const y = inBand
        ? (Math.random() - 0.2) * 10
        : (Math.random() - 0.5) * 16;
      const z = (Math.random() - 0.5) * 22 - 4;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      const pick =
        Math.random() > 0.75 ? cyan : Math.random() > 0.35 ? pale : white;
      col[i * 3] = pick.r;
      col[i * 3 + 1] = pick.g;
      col[i * 3 + 2] = pick.b;
    }

    return { positions: pos, colors: col };
  }, [count]);

  useFrame((state, delta) => {
    state.gl.setClearColor(0x000000, 0);
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.006;
    ref.current.rotation.z = Math.sin(state.clock.getElapsedTime() * 0.04) * 0.02;
    ref.current.position.y =
      Math.sin(state.clock.getElapsedTime() * 0.08) * 0.25;

    const material = ref.current.material as THREE.PointsMaterial;
    material.opacity =
      0.42 + Math.sin(state.clock.getElapsedTime() * 0.35) * 0.08;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default ParticleCloud;
