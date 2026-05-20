import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth-utils";
import {
  DASHBOARD_3D_FORMAT,
  DEFAULT_DASHBOARD_3D_ANSWERS,
  createDefaultDashboard3DSceneConfig,
  resolveDashboard3DScene,
} from "@/lib/dashboard-3d";
import { canAccessModule, isAdminOrSuperadmin } from "@/lib/permissions";
import { getSiteData } from "@/lib/fetchers";
import { createClient } from "@/utils/supabase/server";
import type {
  Dashboard3DAnswers,
  Dashboard3DSceneConfig,
  Dashboard3DSceneStatus,
} from "@/types/supabase";

export const dynamic = "force-dynamic";

async function getAuthorizedSite(domain: string) {
  const [userContext, siteResponse] = await Promise.all([
    getUserContext(),
    getSiteData(domain),
  ]);

  if (!userContext) {
    return { error: "Unauthorized", status: 401 as const };
  }

  if (!siteResponse?.data) {
    return { error: "Site not found", status: 404 as const };
  }

  const siteId = siteResponse.data.id as string;
  if (!isAdminOrSuperadmin(userContext.role)) {
    const hasDashboardAccess = await canAccessModule(
      userContext.userId || userContext.user.id,
      siteId,
      "dashboard",
      userContext.role,
    );

    if (!hasDashboardAccess) {
      return { error: "Forbidden", status: 403 as const };
    }
  }

  return {
    siteId,
    userId: userContext.userId || userContext.user.id,
  };
}

function normalizeAnswers(value: unknown): Dashboard3DAnswers {
  return {
    ...DEFAULT_DASHBOARD_3D_ANSWERS,
    ...(typeof value === "object" && value !== null ? value : {}),
  } as Dashboard3DAnswers;
}

function normalizeSceneConfig(
  value: unknown,
  answers: Dashboard3DAnswers,
): Dashboard3DSceneConfig {
  const fallback = createDefaultDashboard3DSceneConfig(answers);
  const incoming = typeof value === "object" && value !== null
    ? (value as Partial<Dashboard3DSceneConfig>)
    : {};

  return {
    ...fallback,
    ...incoming,
    format: DASHBOARD_3D_FORMAT,
    canvas: {
      ...fallback.canvas,
      ...(incoming.canvas ?? {}),
      widthUnits: 2,
      heightUnits: 1,
      aspectRatio: 2,
      backgroundColor: incoming.canvas?.backgroundColor || answers.backgroundColor,
    },
    camera: {
      ...fallback.camera,
      ...(incoming.camera ?? {}),
    },
    assets: Array.isArray(incoming.assets) ? incoming.assets : fallback.assets,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  try {
    const { domain } = await params;
    const authorized = await getAuthorizedSite(domain);

    if ("error" in authorized) {
      return NextResponse.json(
        { error: authorized.error },
        { status: authorized.status },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("dashboard_3d_scenes")
      .select("*")
      .eq("site_id", authorized.siteId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      scene: resolveDashboard3DScene(data),
      defaults: {
        answers: DEFAULT_DASHBOARD_3D_ANSWERS,
        sceneConfig: createDefaultDashboard3DSceneConfig(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  try {
    const { domain } = await params;
    const authorized = await getAuthorizedSite(domain);

    if ("error" in authorized) {
      return NextResponse.json(
        { error: authorized.error },
        { status: authorized.status },
      );
    }

    const body = await request.json();
    const answers = normalizeAnswers(body.answers);
    const sceneConfig = normalizeSceneConfig(body.sceneConfig, answers);
    const requestedStatus = body.status as Dashboard3DSceneStatus | undefined;
    const status: Dashboard3DSceneStatus = requestedStatus === "published"
      ? "published"
      : "draft";

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("dashboard_3d_scenes")
      .upsert(
        {
          site_id: authorized.siteId,
          created_by: authorized.userId,
          name: typeof body.name === "string" && body.name.trim()
            ? body.name.trim()
            : "Prima dashboard 3D",
          status,
          format: DASHBOARD_3D_FORMAT,
          answers,
          scene_config: sceneConfig,
        },
        { onConflict: "site_id" },
      )
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ scene: resolveDashboard3DScene(data) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = PUT;
