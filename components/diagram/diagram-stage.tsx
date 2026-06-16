"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const DiagramAmbientCanvas = dynamic(
  () => import("@/components/diagram/diagram-ambient-canvas"),
  { ssr: false },
);

export type DiagramStageVariant = "auto" | "fill" | "full";

interface DiagramStageProps {
  children: React.ReactNode;
  /**
   * `auto`: height follows content (CSS org-chart in AreaTreeDiagram).
   * `fill`: fixed viewport height for canvas-based diagrams (React Flow).
   * `full`: fills the parent height (parent already constrains height).
   */
  variant?: DiagramStageVariant;
  /**
   * Enable the WebGL ambient depth layer (phase 4). Self-guards for reduced
   * motion / small screens / missing WebGL; falls back to the static stage.
   */
  ambient?: boolean;
  className?: string;
  /** Optional ref forwarded to the outer stage element. */
  innerRef?: React.Ref<HTMLDivElement>;
}

/** Detects whether the dynamic (parallax + WebGL) layers should run. */
function useDynamicEnvironment(enabled: boolean) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const smallScreen = window.matchMedia("(max-width: 768px)").matches;
    let hasWebGL = false;
    try {
      const canvas = document.createElement("canvas");
      hasWebGL = !!(
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
      );
    } catch {
      hasWebGL = false;
    }

    setActive(!reduceMotion && !smallScreen && hasWebGL);
  }, [enabled]);

  return active;
}

/**
 * Shared layered "stage" background for every diagram screen.
 *
 * Architectural role: this is not mere decoration. It is the shell that today
 * hosts the 2D diagram (CSS / React Flow), today optionally hosts a WebGL
 * ambient layer (phase 4), and is designed to ultimately host a full 3D scene
 * behind the same slot (phase 5).
 *
 * All layers derive from theme tokens (`--page`, `--page-soft`, `--page-glow`,
 * `--page-shadow`, `--primary`) so the depth effect holds in light and dark.
 */
export function DiagramStage({
  children,
  variant = "auto",
  ambient = true,
  className,
  innerRef,
}: DiagramStageProps) {
  const dynamicEnabled = useDynamicEnvironment(ambient);
  const layersRef = useRef<HTMLDivElement>(null);

  // Phase 3: subtle mouse parallax on the background layers (rAF throttled).
  useEffect(() => {
    if (!dynamicEnabled) return;
    const element = layersRef.current;
    if (!element) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const rect = element.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        element.style.setProperty("--stage-parallax-x", `${px * -14}px`);
        element.style.setProperty("--stage-parallax-y", `${py * -14}px`);
      });
    };

    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [dynamicEnabled]);

  return (
    <div
      ref={innerRef}
      className={cn(
        "diagram-stage relative isolate overflow-hidden rounded-xl border shadow-inner",
        variant === "fill" && "h-[70vh] min-h-[480px] w-full",
        variant === "full" && "h-full w-full",
        variant === "auto" && "w-full overflow-x-auto p-6",
        className,
      )}
    >
      {/* Parallax-able background layers. */}
      <div
        ref={layersRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          transform:
            "translate3d(var(--stage-parallax-x, 0px), var(--stage-parallax-y, 0px), 0)",
          transition: "transform 220ms ease-out",
        }}
      >
        <div
          className="absolute inset-[-6%]"
          style={{
            backgroundColor: "hsl(var(--page))",
            backgroundImage: [
              "radial-gradient(circle at 50% -12%, hsl(var(--page-glow) / 0.95), transparent 55%)",
              "radial-gradient(60% 50% at 50% 38%, hsl(var(--primary) / 0.07), transparent 70%)",
              "radial-gradient(120% 80% at 50% 120%, hsl(var(--page-shadow) / 0.55), transparent 60%)",
              "linear-gradient(180deg, hsl(var(--page)) 0%, hsl(var(--page-shadow)) 100%)",
            ].join(", "),
          }}
        />
        {/* Perspective grid floor: soft depth cue. */}
        <div className="diagram-stage__grid absolute inset-x-0 bottom-0 h-1/2" />
      </div>

      {/* WebGL ambient depth layer (phase 4); only when guards pass. */}
      {dynamicEnabled ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <DiagramAmbientCanvas />
        </div>
      ) : null}

      {/* Perimeter vignette to detach content from the edges. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          boxShadow:
            "inset 0 0 80px 24px hsl(var(--page-shadow) / 0.45), inset 0 0 200px 60px hsl(var(--page-shadow) / 0.25)",
        }}
      />

      {/* Content slot above all background layers. */}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
