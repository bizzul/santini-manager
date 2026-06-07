"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitItem, OrbitSet } from "./orbit-items";

interface OrbitRingProps {
  center: [number, number, number];
  radius: number;
  innerRadius?: number;
  badgePx?: number;
  parentColor: string;
  orbit: OrbitSet;
  visible: boolean;
  /** Currently focused orbit badge id (for highlight). */
  selectedOrbitItemId?: string | null;
  onItemClick?: (item: OrbitItem) => void;
  onItemDoubleClick?: (item: OrbitItem) => void;
}

export function OrbitRing({
  center,
  radius,
  innerRadius = 1.15,
  badgePx = 24,
  parentColor,
  orbit,
  visible,
  selectedOrbitItemId = null,
  onItemClick,
  onItemDoubleClick,
}: OrbitRingProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.z -= delta * 0.035;
  });

  const items = orbit.items;

  const geometry = useMemo(() => {
    const n = items.length;
    if (n === 0) {
      return [] as Array<{
        badge: [number, number];
        spoke: [[number, number, number], [number, number, number]];
      }>;
    }
    const step = (Math.PI * 2) / n;
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
                  isSelected={selectedOrbitItemId === item.id}
                  onClick={onItemClick}
                  onDoubleClick={onItemDoubleClick}
                />
              </Html>
            </Billboard>
          );
        })}
      </group>
    </group>
  );
}

function OrbitBadge({
  item,
  parentColor,
  sizePx,
  isSelected,
  onClick,
  onDoubleClick,
}: {
  item: OrbitItem;
  parentColor: string;
  sizePx: number;
  isSelected: boolean;
  onClick?: (item: OrbitItem) => void;
  onDoubleClick?: (item: OrbitItem) => void;
}) {
  const accent = item.color || parentColor;
  const [hovered, setHovered] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(item.imageUrl) && !imageFailed;
  const active = hovered || isSelected;
  const interactive = Boolean(onClick || onDoubleClick);

  const formatDueDate = (iso: string | null | undefined): string | null => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
      });
    } catch {
      return null;
    }
  };

  const dueLabel = formatDueDate(item.dueDate);

  return (
    <div
      style={{
        position: "relative",
        pointerEvents: "none",
      }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={
          onClick
            ? (e) => {
                e.stopPropagation();
                onClick(item);
              }
            : undefined
        }
        onDoubleClick={
          onDoubleClick
            ? (e) => {
                e.stopPropagation();
                onDoubleClick(item);
              }
            : undefined
        }
        style={{
          pointerEvents: interactive ? "auto" : "none",
          width: sizePx,
          height: sizePx,
          borderRadius: "50%",
          border: `1.5px solid ${accent}${active ? "" : "aa"}`,
          background: isSelected
            ? "rgba(6, 10, 20, 0.95)"
            : "rgba(6, 10, 20, 0.85)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: active
            ? `0 0 18px ${accent}88, 0 2px 10px rgba(0,0,0,0.5)`
            : `0 0 6px ${accent}44, 0 1px 4px rgba(0,0,0,0.4)`,
          transform: `scale(${hovered ? 2 : isSelected ? 1.15 : 1})`,
          transformOrigin: "center",
          transition:
            "transform 220ms cubic-bezier(0.2, 0.9, 0.3, 1.2), box-shadow 220ms ease, border-color 220ms ease",
          cursor: interactive ? "pointer" : "default",
          backdropFilter: "blur(4px)",
          zIndex: active ? 10 : 1,
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

      {active && (
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
            {item.status && (
              <div
                style={{
                  color: "rgba(226, 232, 240, 0.75)",
                  fontSize: 9,
                  marginTop: 2,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {item.status}
              </div>
            )}
            {dueLabel && (
              <div
                style={{
                  color: "#fde68a",
                  fontSize: 9,
                  marginTop: 1,
                  letterSpacing: "0.1em",
                }}
              >
                Scadenza · {dueLabel}
              </div>
            )}
            {interactive && (
              <div
                style={{
                  color: "rgba(148, 163, 184, 0.85)",
                  fontSize: 8,
                  marginTop: 3,
                  letterSpacing: "0.08em",
                }}
              >
                Click focus · double-click apri
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
