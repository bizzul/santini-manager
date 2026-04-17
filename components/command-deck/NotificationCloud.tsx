"use client";

import { motion } from "framer-motion";
import type { CommandDeckNotification } from "./nodes";

interface NotificationCloudProps {
  notification: CommandDeckNotification;
  color: string;
  active: boolean;
  dim: number;
  /** 0..1 phase offset so the floating animation isn't synced across nodes. */
  phase?: number;
}

/**
 * Small floating "notification cloud" rendered inside a drei <Html>
 * billboard above each node.
 *
 * Visual design rules:
 *  - subtle by default (~70% opacity), discreet floating via framer-motion
 *  - grows and brightens when the node is hovered or selected
 *  - tone drives the accent color of the count pill (warning/positive/…)
 *
 * Implementation notes:
 *  - Kept as plain HTML to stay lightweight and crisp at any zoom level.
 *  - `pointer-events` is disabled on the root so the cloud never steals
 *    clicks from the underlying 3D node.
 */
export function NotificationCloud({
  notification,
  color,
  active,
  dim,
  phase = 0,
}: NotificationCloudProps) {
  const { count, label, tone = "neutral" } = notification;

  const toneColor =
    tone === "warning"
      ? "#fbbf24" // amber-400
      : tone === "negative"
        ? "#fb7185" // rose-400
        : tone === "positive"
          ? "#34d399" // emerald-400
          : color;

  const scale = active ? 1.08 : 1;
  const opacity = (active ? 1 : 0.82) * dim;

  return (
    <motion.div
      // Floating bob — very gentle, phase-shifted per node.
      animate={{
        y: [0, -3, 0, 2, 0],
      }}
      transition={{
        duration: 4.2,
        repeat: Infinity,
        ease: "easeInOut",
        delay: phase,
      }}
      style={{
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "center bottom",
        transition:
          "transform 200ms ease, opacity 200ms ease, box-shadow 200ms ease",
        pointerEvents: "none",
        userSelect: "none",
        fontFamily: "inherit",
      }}
      className="flex flex-col items-center"
    >
      {/* The cloud itself */}
      <div
        className="flex items-center gap-3 rounded-full border px-5 py-2.5"
        style={{
          borderColor: `${color}88`,
          // 50% transparent glass — lets the scene breathe behind the pill.
          background: "rgba(6, 10, 20, 0.5)",
          backdropFilter: "blur(8px)",
          boxShadow: active
            ? `0 0 20px ${color}44, 0 2px 10px rgba(0,0,0,0.45)`
            : `0 0 10px ${color}22, 0 2px 8px rgba(0,0,0,0.35)`,
        }}
      >
        <span
          className="flex h-9 min-w-[36px] items-center justify-center rounded-full px-2 text-[24px] font-bold"
          style={{
            background: `${toneColor}2a`,
            color: toneColor,
            border: `1px solid ${toneColor}55`,
            textShadow: `0 0 6px ${toneColor}55`,
          }}
        >
          {count}
        </span>
        <span
          className="text-[26px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "rgba(226, 232, 240, 0.92)" }}
        >
          {label}
        </span>
      </div>

      {/* Little tail connecting the cloud to the node (visual anchor) */}
      <div
        style={{
          width: 2,
          height: 10,
          marginTop: 1,
          background: `linear-gradient(to bottom, ${color}66, transparent)`,
        }}
      />
    </motion.div>
  );
}
