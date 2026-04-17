"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { USER_NODE_POSITION } from "./nodes";

interface UserNodeProps {
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
  isActive: boolean;
  anyActive: boolean;
  onHover: (hovered: boolean) => void;
  onClick: () => void;
}

/**
 * Central user node.
 *
 * The user avatar is the fulcrum of the Command Deck home. Visually it is
 * composed of three layers:
 *  - a faint, always-visible outer halo ring (3D, billboarded)
 *  - a soft emissive orb behind the avatar (3D)
 *  - an HTML circular avatar (image or initials) floating in front
 *
 * Clicking the user node is the canonical way to return to galaxy view.
 */
export function UserNode({
  name,
  subtitle,
  avatarUrl,
  isActive,
  anyActive,
  onHover,
  onClick,
}: UserNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const orbRef = useRef<THREE.Mesh>(null);
  const outerHaloRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    // Very gentle bob — the user node is the visual anchor, so keep it steady.
    groupRef.current.position.y =
      USER_NODE_POSITION[1] + Math.sin(t * 0.6) * 0.04;
    if (orbRef.current) {
      orbRef.current.rotation.y += 0.003;
    }
    // Slow breathing halo.
    if (outerHaloRef.current) {
      const s = 1 + Math.sin(t * 0.9) * 0.04;
      outerHaloRef.current.scale.set(s, s, 1);
    }
  });

  // When another node is active, de-emphasize the user node a bit. When the
  // user node itself is active we push emissive up as a click affordance.
  const dim = anyActive && !isActive ? 0.6 : 1;
  const emissiveIntensity = isActive ? 1.0 : 0.55;

  return (
    <group
      ref={groupRef}
      position={USER_NODE_POSITION}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Soft emissive orb behind the avatar */}
      <mesh ref={orbRef}>
        <sphereGeometry args={[0.62, 24, 18]} />
        <meshStandardMaterial
          color="#0b1224"
          emissive="#38bdf8"
          emissiveIntensity={emissiveIntensity}
          metalness={0.4}
          roughness={0.5}
          transparent
          opacity={0.95 * dim}
        />
      </mesh>

      {/* Inner halo ring — tight */}
      <Billboard>
        <mesh>
          <ringGeometry args={[0.88, 0.93, 48]} />
          <meshBasicMaterial
            color="#7dd3fc"
            transparent
            opacity={isActive ? 0.8 : 0.45 * dim}
            depthWrite={false}
          />
        </mesh>
      </Billboard>

      {/* Outer halo — slow breathing */}
      <Billboard>
        <mesh ref={outerHaloRef}>
          <ringGeometry args={[1.1, 1.14, 48]} />
          <meshBasicMaterial
            color="#7dd3fc"
            transparent
            opacity={isActive ? 0.45 : 0.18 * dim}
            depthWrite={false}
          />
        </mesh>
      </Billboard>

      {/* HTML avatar + name */}
      <Billboard>
        <Html
          center
          distanceFactor={7.5}
          style={{
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <div
            className="flex flex-col items-center"
            style={{ fontFamily: "inherit", opacity: dim }}
          >
            <UserAvatar name={name} avatarUrl={avatarUrl} active={isActive} />
            <div
              className="mt-2 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{
                color: "#e0f2fe",
                borderColor: "rgba(125, 211, 252, 0.55)",
                background: "rgba(6, 10, 20, 0.78)",
                backdropFilter: "blur(6px)",
                boxShadow: "0 0 18px rgba(125, 211, 252, 0.18)",
              }}
            >
              {name || "Commander"}
            </div>
            {subtitle && (
              <div className="mt-1 text-[9px] tracking-[0.28em] uppercase text-slate-400">
                {subtitle}
              </div>
            )}
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

function UserAvatar({
  name,
  avatarUrl,
  active,
}: {
  name: string;
  avatarUrl?: string | null;
  active: boolean;
}) {
  // If the image fails to load (broken URL, 403, stale OAuth avatar, …) we
  // gracefully fall back to initials instead of leaking the browser's broken
  // image glyph over the canvas.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(avatarUrl) && !imageFailed;

  const size = 64;
  const border = active
    ? "2px solid #7dd3fc"
    : "2px solid rgba(125, 211, 252, 0.65)";
  const shadow = active
    ? "0 0 28px rgba(125, 211, 252, 0.55)"
    : "0 0 18px rgba(125, 211, 252, 0.25)";

  const common: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    border,
    boxShadow: shadow,
    background:
      "radial-gradient(circle at 30% 25%, rgba(125, 211, 252, 0.35), rgba(6, 10, 20, 0.9) 70%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    transition: "box-shadow 220ms ease, border-color 220ms ease",
  };

  return (
    <div style={common}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl as string}
          alt={name}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "50%",
          }}
        />
      ) : (
        <span
          className="font-semibold"
          style={{
            color: "#e0f2fe",
            fontSize: 20,
            letterSpacing: "0.08em",
            textShadow: "0 0 12px rgba(125, 211, 252, 0.55)",
          }}
        >
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}

function getInitials(name: string): string {
  if (!name) return "CM";
  const parts = name
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "CM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
