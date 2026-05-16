"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type {
  Dashboard3DAnimationType,
  Dashboard3DSceneAsset,
  Dashboard3DSceneConfig,
} from "@/types/supabase";
import { cn } from "@/lib/utils";

type Dashboard3DViewerProps = {
  config: Dashboard3DSceneConfig;
  className?: string;
  interactive?: boolean;
};

function getAnimatedTransform(
  basePosition: Dashboard3DSceneAsset["position"],
  animation: Dashboard3DAnimationType | undefined,
  elapsed: number,
) {
  if (animation === "float") {
    return [basePosition.x, basePosition.y + Math.sin(elapsed * 1.6) * 0.08, basePosition.z] as const;
  }

  if (animation === "pulse") {
    return [basePosition.x, basePosition.y, basePosition.z + Math.sin(elapsed * 2) * 0.04] as const;
  }

  return [basePosition.x, basePosition.y, basePosition.z] as const;
}

function AnimatedGroup({
  asset,
  children,
}: {
  asset: Dashboard3DSceneAsset;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    const elapsed = clock.getElapsedTime();
    const [x, y, z] = getAnimatedTransform(asset.position, asset.animation, elapsed);
    group.position.set(x, y, z);
    group.rotation.set(asset.rotation.x, asset.rotation.y, asset.rotation.z);

    if (asset.animation === "rotate") {
      group.rotation.y += elapsed * 0.45;
    }
  });

  return (
    <group
      ref={groupRef}
      scale={[asset.scale.x, asset.scale.y, asset.scale.z]}
      position={[asset.position.x, asset.position.y, asset.position.z]}
      rotation={[asset.rotation.x, asset.rotation.y, asset.rotation.z]}
    >
      {children}
    </group>
  );
}

function PrimitiveAsset({ asset }: { asset: Dashboard3DSceneAsset }) {
  const color = asset.color ?? "#38bdf8";
  const opacity = asset.opacity ?? 0.95;
  const transparent = opacity < 1;

  return (
    <AnimatedGroup asset={asset}>
      <mesh castShadow receiveShadow>
        {asset.primitive === "sphere" ? (
          <sphereGeometry args={[0.7, 48, 48]} />
        ) : asset.primitive === "cylinder" ? (
          <cylinderGeometry args={[0.45, 0.45, 1.2, 48]} />
        ) : (
          <boxGeometry args={[1, 1, 1]} />
        )}
        <meshStandardMaterial
          color={color}
          metalness={0.2}
          roughness={0.35}
          opacity={opacity}
          transparent={transparent}
        />
      </mesh>
    </AnimatedGroup>
  );
}

function ModelAsset({ asset }: { asset: Dashboard3DSceneAsset }) {
  const gltf = useGLTF(asset.url || "");
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  return (
    <AnimatedGroup asset={asset}>
      <primitive object={scene} />
    </AnimatedGroup>
  );
}

function BackgroundImage({ asset }: { asset: Dashboard3DSceneAsset }) {
  const texture = useLoader(THREE.TextureLoader, asset.url || "");

  return (
    <mesh position={[0, 0, -1.4]}>
      <planeGeometry args={[4, 2]} />
      <meshBasicMaterial map={texture} toneMapped={false} transparent opacity={asset.opacity ?? 1} />
    </mesh>
  );
}

function SceneContents({ config }: { config: Dashboard3DSceneConfig }) {
  const backgroundImages = config.assets.filter(
    (asset) => asset.type === "background_image" && asset.url,
  );
  const foregroundAssets = config.assets.filter((asset) => asset.type !== "background_image");

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[
          config.camera.position.x,
          config.camera.position.y,
          config.camera.position.z,
        ]}
        fov={38}
      />
      <color attach="background" args={[config.canvas.backgroundColor]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} castShadow />
      <pointLight position={[-3, -2, 3]} intensity={0.8} color="#38bdf8" />
      <Suspense fallback={null}>
        {backgroundImages.map((asset) => (
          <BackgroundImage key={asset.id} asset={asset} />
        ))}
        {foregroundAssets.map((asset) => {
          if (asset.type === "model_3d" && asset.url) {
            return <ModelAsset key={asset.id} asset={asset} />;
          }

          return <PrimitiveAsset key={asset.id} asset={asset} />;
        })}
        <Environment preset="city" />
      </Suspense>
    </>
  );
}

export function Dashboard3DViewer({
  config,
  className,
  interactive = true,
}: Dashboard3DViewerProps) {
  return (
    <div
      className={cn(
        "relative aspect-[2/1] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl",
        className,
      )}
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
        className="h-full w-full"
      >
        <SceneContents config={config} />
        {interactive && (
          <OrbitControls
            enablePan={false}
            enableZoom
            maxDistance={7}
            minDistance={2.4}
            target={[
              config.camera.target.x,
              config.camera.target.y,
              config.camera.target.z,
            ]}
          />
        )}
      </Canvas>
      <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
        formato b2 h1
      </div>
    </div>
  );
}
