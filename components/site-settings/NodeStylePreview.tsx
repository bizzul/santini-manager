"use client";

import { cn } from "@/lib/utils";
import type { FlowchartNodeStyle } from "@/lib/flowchart-settings";

interface NodeStylePreviewProps {
  style: FlowchartNodeStyle;
  className?: string;
}

/**
 * Tiny generated SVG example of a diagram (root + two children) drawing the
 * node shapes of the given graphical model. No external images needed.
 */
export function NodeStylePreview({ style, className }: NodeStylePreviewProps) {
  const rootFill = "fill-teal-500/25";
  const rootStroke = "stroke-teal-300";
  const childFill = "fill-white/10";
  const childStroke = "stroke-white/60";
  const edgeStroke = "stroke-white/35";

  return (
    <svg
      viewBox="0 0 96 60"
      className={cn("block", className)}
      aria-hidden="true"
    >
      {/* edges root -> children */}
      <path
        d="M48 19 L24 37"
        strokeWidth="1.5"
        fill="none"
        className={edgeStroke}
      />
      <path
        d="M48 19 L72 37"
        strokeWidth="1.5"
        fill="none"
        className={edgeStroke}
      />

      {/* root node */}
      {style === "rect" ? (
        <rect
          x="34"
          y="3"
          width="28"
          height="16"
          rx="3"
          strokeWidth="1.5"
          className={cn(rootFill, rootStroke)}
        />
      ) : (
        <circle
          cx="48"
          cy="11"
          r="8.5"
          strokeWidth="1.5"
          className={cn(rootFill, rootStroke)}
        />
      )}

      {/* child nodes */}
      {style === "oval" ? (
        <>
          <ellipse
            cx="24"
            cy="45"
            rx="15"
            ry="8"
            strokeWidth="1.5"
            className={cn(childFill, childStroke)}
          />
          <ellipse
            cx="72"
            cy="45"
            rx="15"
            ry="8"
            strokeWidth="1.5"
            className={cn(childFill, childStroke)}
          />
        </>
      ) : (
        <>
          <rect
            x="9"
            y="37"
            width="30"
            height="16"
            rx={style === "hybrid" ? 5 : 2}
            strokeWidth="1.5"
            className={cn(childFill, childStroke)}
          />
          <rect
            x="57"
            y="37"
            width="30"
            height="16"
            rx={style === "hybrid" ? 5 : 2}
            strokeWidth="1.5"
            className={cn(childFill, childStroke)}
          />
        </>
      )}
    </svg>
  );
}

export default NodeStylePreview;
