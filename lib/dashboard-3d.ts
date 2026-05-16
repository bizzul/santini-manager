import type {
  Dashboard3DAnswers,
  Dashboard3DScene,
  Dashboard3DSceneConfig,
  Dashboard3DVector3,
} from "@/types/supabase";

export const DASHBOARD_3D_ASSET_BUCKET = "dashboard-3d-assets";
export const DASHBOARD_3D_FORMAT = "b2_h1" as const;

export const DEFAULT_DASHBOARD_3D_ANSWERS: Dashboard3DAnswers = {
  goal: "showroom",
  style: "premium",
  primaryColor: "#38bdf8",
  backgroundColor: "#020617",
  accentColor: "#f59e0b",
  intensity: 70,
};

const ZERO_VECTOR: Dashboard3DVector3 = { x: 0, y: 0, z: 0 };

export const DEFAULT_DASHBOARD_3D_CONFIG: Dashboard3DSceneConfig = {
  format: DASHBOARD_3D_FORMAT,
  canvas: {
    widthUnits: 2,
    heightUnits: 1,
    aspectRatio: 2,
    backgroundColor: DEFAULT_DASHBOARD_3D_ANSWERS.backgroundColor,
  },
  camera: {
    position: { x: 0, y: 0, z: 5 },
    target: ZERO_VECTOR,
    zoom: 1,
  },
  assets: [
    {
      id: "starter-cube",
      type: "primitive",
      name: "Elemento 3D base",
      primitive: "box",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0.2, y: 0.7, z: 0 },
      scale: { x: 0.85, y: 0.85, z: 0.85 },
      color: DEFAULT_DASHBOARD_3D_ANSWERS.primaryColor,
      opacity: 0.95,
      animation: "float",
    },
  ],
};

export function createDefaultDashboard3DSceneConfig(
  answers: Dashboard3DAnswers = DEFAULT_DASHBOARD_3D_ANSWERS,
): Dashboard3DSceneConfig {
  return {
    ...DEFAULT_DASHBOARD_3D_CONFIG,
    canvas: {
      ...DEFAULT_DASHBOARD_3D_CONFIG.canvas,
      backgroundColor: answers.backgroundColor,
    },
    assets: DEFAULT_DASHBOARD_3D_CONFIG.assets.map((asset) => ({
      ...asset,
      color: answers.primaryColor,
    })),
  };
}

export function getDashboard3DAssetPath(siteId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${siteId}/dashboard-3d/${Date.now()}-${safeName}`;
}

export function resolveDashboard3DScene(
  rawScene: Partial<Dashboard3DScene> | null | undefined,
): Dashboard3DScene | null {
  if (!rawScene?.id || !rawScene.site_id) {
    return null;
  }

  const answers = {
    ...DEFAULT_DASHBOARD_3D_ANSWERS,
    ...(rawScene.answers ?? {}),
  } as Dashboard3DAnswers;

  const fallbackConfig = createDefaultDashboard3DSceneConfig(answers);
  const sceneConfig = {
    ...fallbackConfig,
    ...(rawScene.scene_config ?? {}),
    canvas: {
      ...fallbackConfig.canvas,
      ...(rawScene.scene_config?.canvas ?? {}),
      aspectRatio: 2,
      widthUnits: 2,
      heightUnits: 1,
    },
    camera: {
      ...fallbackConfig.camera,
      ...(rawScene.scene_config?.camera ?? {}),
    },
    assets: Array.isArray(rawScene.scene_config?.assets)
      ? rawScene.scene_config.assets
      : fallbackConfig.assets,
  } as Dashboard3DSceneConfig;

  return {
    id: rawScene.id,
    site_id: rawScene.site_id,
    created_by: rawScene.created_by ?? null,
    name: rawScene.name ?? "Prima dashboard 3D",
    status: rawScene.status ?? "draft",
    format: DASHBOARD_3D_FORMAT,
    answers,
    scene_config: sceneConfig,
    created_at: rawScene.created_at ?? new Date().toISOString(),
    updated_at: rawScene.updated_at ?? new Date().toISOString(),
  };
}
