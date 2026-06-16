"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import ParticleCloud from "@/components/diagram/diagram-ambient-field";

/** Reads an HSL token (e.g. "222 30% 12.5%") and returns a CSS hsl() string. */
function readToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!raw) return fallback;
  const parts = raw.split(/\s+/);
  if (parts.length < 3) return fallback;
  return `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
}

/**
 * Ambient WebGL depth layer mounted behind the 2D diagram inside DiagramStage.
 * Self-guards for reduced motion / small screens (caller also guards), and
 * resolves colors from theme tokens so it tracks light/dark.
 */
export default function DiagramAmbientCanvas() {
  const [colors, setColors] = useState<{ base: string; accent: string } | null>(
    null,
  );

  useEffect(() => {
    setColors({
      base: readToken("--page-glow", "hsl(45, 42%, 97.5%)"),
      accent: readToken("--primary", "hsl(222, 47%, 11%)"),
    });
  }, []);

  const dpr = useMemo<[number, number]>(() => [1, 1.5], []);

  if (!colors) return null;

  return (
    <Canvas
      className="!absolute !inset-0"
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 14], fov: 55 }}
      style={{ pointerEvents: "none" }}
    >
      <ParticleCloud color={colors.base} accent={colors.accent} />
    </Canvas>
  );
}
