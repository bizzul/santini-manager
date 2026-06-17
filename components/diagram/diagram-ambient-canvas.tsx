"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import ParticleCloud from "@/components/diagram/diagram-ambient-field";

/**
 * Ambient WebGL depth layer: extra star depth behind the CSS sky gradient.
 * Must stay fully transparent — the opaque sky layer sits above this canvas.
 */
export default function DiagramAmbientCanvas() {
  const dpr = useMemo<[number, number]>(() => [1, 1.5], []);

  return (
    <Canvas
      className="diagram-stage__webgl-canvas !absolute !inset-0"
      dpr={dpr}
      gl={{
        antialias: true,
        alpha: true,
        premultipliedAlpha: false,
        powerPreference: "low-power",
      }}
      camera={{ position: [0, 0, 14], fov: 55 }}
      style={{ pointerEvents: "none", background: "transparent" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <ParticleCloud count={900} />
    </Canvas>
  );
}
