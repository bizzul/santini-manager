"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
  glow: boolean;
}

interface DiagramStarfieldCanvasProps {
  animated?: boolean;
}

/** Lightweight 2D starfield with twinkle — galactic backdrop for diagram stages. */
export default function DiagramStarfieldCanvas({
  animated = true,
}: DiagramStarfieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars: Star[] = [];
    let raf = 0;
    let w = 0;
    let h = 0;

    const buildStars = () => {
      const density = Math.floor((w * h) / 850);
      const count = Math.min(Math.max(density, 280), 2200);
      stars = [];

      for (let i = 0; i < count; i++) {
        stars.push(makeStar(Math.random() * w, Math.random() * h * 0.94, false));
      }

      // Milky-way band: denser diagonal cluster.
      const bandCount = Math.floor(count * 0.38);
      for (let i = 0; i < bandCount; i++) {
        const t = Math.random();
        const x = w * (0.08 + t * 0.84);
        const y = h * (0.22 + t * 0.38 + (Math.random() - 0.5) * 0.08);
        stars.push(makeStar(x, y, Math.random() > 0.55));
      }
    };

    const makeStar = (x: number, y: number, glow: boolean): Star => ({
      x,
      y,
      r: glow ? Math.random() * 1.6 + 1.2 : Math.random() * 1.6 + 0.25,
      baseOpacity: Math.random() * 0.65 + 0.35,
      twinkleSpeed: Math.random() * 1.8 + 0.4,
      twinklePhase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.18 ? "#ffffff" : "#ccf0ff",
      glow,
    });

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      w = parent.clientWidth;
      h = parent.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h);

      for (const star of stars) {
        const opacity = animated
          ? star.baseOpacity *
            (0.5 +
              0.5 *
                Math.sin(time * 0.001 * star.twinkleSpeed + star.twinklePhase))
          : star.baseOpacity;

        ctx.globalAlpha = opacity;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();

        if (star.glow) {
          const gradient = ctx.createRadialGradient(
            star.x,
            star.y,
            0,
            star.x,
            star.y,
            star.r * 5,
          );
          gradient.addColorStop(0, `rgba(180, 220, 255, ${opacity * 0.45})`);
          gradient.addColorStop(1, "rgba(180, 220, 255, 0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.r * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      if (animated) raf = window.requestAnimationFrame(draw);
    };

    resize();
    const parent = canvas.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    if (animated) {
      raf = window.requestAnimationFrame(draw);
    } else {
      draw(0);
    }

    return () => {
      observer.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [animated]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[5] h-full w-full"
      aria-hidden
      style={{ background: "transparent" }}
    />
  );
}
