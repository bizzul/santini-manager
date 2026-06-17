"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import DiagramStarfieldCanvas from "@/components/diagram/diagram-starfield-canvas";

export type DiagramStageVariant = "auto" | "fill" | "full";

interface DiagramStageProps {
  children: React.ReactNode;
  variant?: DiagramStageVariant;
  ambient?: boolean;
  className?: string;
  innerRef?: React.Ref<HTMLDivElement>;
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  return reducedMotion;
}

/**
 * Galactic stage shell for every diagram screen: deep-space gradient, nebula,
 * animated starfield, horizon glow and mountain silhouette. Designed to lift
 * the 2D diagram nodes with strong contrast via `.diagram-node-surface`.
 */
export function DiagramStage({
  children,
  variant = "auto",
  ambient: _ambient = true,
  className,
  innerRef,
}: DiagramStageProps) {
  const reducedMotion = useReducedMotion();
  const layersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
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
        element.style.setProperty("--stage-parallax-x", `${px * -18}px`);
        element.style.setProperty("--stage-parallax-y", `${py * -18}px`);
      });
    };

    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  return (
    <div
      ref={innerRef}
      className={cn(
        "diagram-stage diagram-stage--galactic relative overflow-hidden rounded-xl border shadow-inner",
        variant === "fill" && "h-[70vh] min-h-[480px] w-full",
        variant === "full" && "h-full w-full",
        variant === "auto" && "w-full overflow-x-auto p-6",
        className,
      )}
      style={{
        background:
          "linear-gradient(180deg, #000510 0%, #001028 38%, #002244 72%, #003366 100%)",
      }}
    >
      <div
        ref={layersRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          transform:
            "translate3d(var(--stage-parallax-x, 0px), var(--stage-parallax-y, 0px), 0)",
          transition: "transform 280ms ease-out",
        }}
      >
        {/* Base sky gradient (opaque — always visible) */}
        <div className="diagram-stage__sky absolute inset-[-8%]" />

        {/* Nebula / milky-way wisps */}
        <div className="diagram-stage__nebula absolute inset-[-4%]" />

        {/* Animated 2D starfield (transparent canvas) */}
        <DiagramStarfieldCanvas animated={!reducedMotion} />

        {/* Horizon cyan glow */}
        <div className="diagram-stage__horizon absolute inset-x-0 bottom-0 h-[42%]" />

        {/* Mountain silhouette */}
        <svg
          className="diagram-stage__mountains absolute bottom-0 left-0 w-full"
          viewBox="0 0 1200 90"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            fill="url(#galactic-mountain-fill)"
            d="M0,90 L0,52 L70,58 L140,38 L210,50 L290,28 L380,48 L470,22 L560,44 L650,30 L740,52 L830,36 L920,54 L1010,40 L1100,56 L1200,46 L1200,90 Z"
          />
          <defs>
            <linearGradient id="galactic-mountain-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#001830" />
              <stop offset="100%" stopColor="#000510" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Edge vignette */}
      <div
        aria-hidden
        className="diagram-stage__vignette pointer-events-none absolute inset-0 z-0"
      />

      <div className="diagram-stage__content relative z-[1] h-full w-full">
        {children}
      </div>
    </div>
  );
}
