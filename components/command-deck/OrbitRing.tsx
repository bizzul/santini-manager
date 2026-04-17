"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitItem, OrbitSet } from "./orbit-items";

interface OrbitRingProps {
  /** World-space position of the parent node (the orbit's center). */
  center: [number, number, number];
  /** Distance from `center` at which the small circles are placed. */
  radius: number;
  /**
   * Inner radius from which the connecting spokes start. Typically set to
   * the parent node's halo outer radius (including its selected-state
   * scale), so the lines appear to grow out of the main circle's perimeter.
   */
  innerRadius?: number;
  /** Diameter (in CSS pixels) of each mini-circle at normal scale. */
  badgePx?: number;
  /** Parent node accent color used when an item doesn't specify its own. */
  parentColor: string;
  /** Pre-cap orbit set (items + total + demo flag). */
  orbit: OrbitSet;
  /** Optional: mount/unmount animation phase (0..1). */
  visible: boolean;
}

/**
 * Distributes `orbit.items` uniformly around `center` using the canonical
 * formula:
 *
 *     angleStep = 2π / n
 *     angle     = index * angleStep
 *
 * Items are rendered as HTML circular badges inside drei `<Billboard>` +
 * `<Html>`, so the avatar or initials always face the camera and stay
 * crisp regardless of zoom. CSS handles the hover scale (200%) — no React
 * state per-item is required, which keeps the tree light for ~48 items.
 *
 * The whole ring slowly rotates to feel alive without stealing attention.
 */
export function OrbitRing({
  center,
  radius,
  innerRadius = 1.15,
  badgePx = 24,
  parentColor,
  orbit,
  visible,
}: OrbitRingProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    // Gentle clockwise rotation; small enough not to disorient during hover.
    groupRef.current.rotation.z -= delta * 0.035;
  });

  const items = orbit.items;

  /**
   * For each item we pre-compute both:
   *  - the badge position (on the outer orbit radius)
   *  - the spoke endpoints: from the parent circle's perimeter
   *    (`innerRadius`) to a point just short of the badge center
   *    (`radius - shortFall`) so the line doesn't disappear behind the
   *    badge when the badge is hovered (+200% scale).
   */
  const geometry = useMemo(() => {
    const n = items.length;
    if (n === 0) {
      return [] as Array<{
        badge: [number, number];
        spoke: [[number, number, number], [number, number, number]];
      }>;
    }
    const step = (Math.PI * 2) / n;
    // Pull the spoke's outer end slightly short of the badge so the line
    // reads as "attached" rather than piercing the circle.
    const outerShortfall = 0.06;
    return items.map((_, i) => {
      const angle = i * step;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
        badge: [cos * radius, sin * radius] as [number, number],
        spoke: [
          [cos * innerRadius, sin * innerRadius, 0] as [number, number, number],
          [cos * (radius - outerShortfall), sin * (radius - outerShortfall), 0] as [
            number,
            number,
            number,
          ],
        ],
      };
    });
  }, [items, radius, innerRadius]);

  if (!visible || items.length === 0) return null;

  return (
    <group position={center}>
      <group ref={groupRef}>
        {/* Radial spokes: thin glowing lines from the main circle's
            perimeter out to each orbit item. Rendered as a sibling of the
            Html badges inside the rotating group so they rotate in sync. */}
        {geometry.map((g, idx) => (
          <Line
            key={`spoke-${items[idx].id}`}
            points={g.spoke}
            color={parentColor}
            opacity={0.55}
            transparent
            lineWidth={0.9}
            dashed={false}
          />
        ))}

        {items.map((item, idx) => {
          const [x, y] = geometry[idx].badge;
          return (
            <Billboard key={item.id} position={[x, y, 0.05]}>
              <Html
                center
                distanceFactor={8.5}
                style={{
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                <OrbitBadge
                  item={item}
                  parentColor={parentColor}
                  sizePx={badgePx}
                />
              </Html>
            </Billboard>
          );
        })}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Single orbit item rendered as an HTML circle.
// ---------------------------------------------------------------------------

function OrbitBadge({
  item,
  parentColor,
  sizePx,
}: {
  item: OrbitItem;
  parentColor: string;
  sizePx: number;
}) {
  const accent = item.color || parentColor;
  const [hovered, setHovered] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(item.imageUrl) && !imageFailed;

  // Hover scales the whole badge group to 200% (user requirement), with a
  // springy transition powered by CSS. Pointer-events are re-enabled just on
  // the hoverable core — the outer wrapper stays pointer-events:none so the
  // rotating ring group doesn't eat clicks from the parent 3D node.
  return (
    <div
      style={{
        position: "relative",
        pointerEvents: "none",
      }}
    >
      {/* Hoverable core */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          pointerEvents: "auto",
          width: sizePx,
          height: sizePx,
          borderRadius: "50%",
          border: `1.5px solid ${accent}${hovered ? "" : "aa"}`,
          background: "rgba(6, 10, 20, 0.85)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: hovered
            ? `0 0 18px ${accent}88, 0 2px 10px rgba(0,0,0,0.5)`
            : `0 0 6px ${accent}44, 0 1px 4px rgba(0,0,0,0.4)`,
          transform: `scale(${hovered ? 2 : 1})`,
          transformOrigin: "center",
          transition:
            "transform 220ms cubic-bezier(0.2, 0.9, 0.3, 1.2), box-shadow 220ms ease, border-color 220ms ease",
          cursor: "pointer",
          backdropFilter: "blur(4px)",
          zIndex: hovered ? 10 : 1,
        }}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl as string}
            alt={item.label}
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <span
            style={{
              color: accent,
              fontSize: Math.max(8, Math.round(sizePx * 0.38)),
              fontWeight: 700,
              letterSpacing: "0.02em",
              textShadow: `0 0 6px ${accent}77`,
            }}
          >
            {item.initials}
          </span>
        )}
      </div>

      {/* Hover tooltip with label + category */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 14px)",
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 20,
          }}
        >
          <div
            style={{
              background: "rgba(6, 10, 20, 0.92)",
              border: `1px solid ${accent}66`,
              borderRadius: 6,
              padding: "4px 8px",
              boxShadow: `0 0 16px ${accent}33, 0 4px 12px rgba(0,0,0,0.5)`,
              backdropFilter: "blur(6px)",
              fontFamily: "inherit",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#f1f5f9",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              {item.label}
            </div>
            {item.category && (
              <div
                style={{
                  color: `${accent}cc`,
                  fontSize: 9,
                  marginTop: 1,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                {item.category}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
