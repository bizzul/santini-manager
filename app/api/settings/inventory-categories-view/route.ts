import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import {
  INVENTORY_CATEGORIES_VIEW_MODE_KEY,
  type CategoryViewMode,
} from "@/types/category-cards";

function normalizeViewMode(value: unknown): CategoryViewMode {
  return value === "grid" ? "grid" : "table";
}

async function resolveSiteId(
  domain?: string | null,
  siteId?: string | null,
): Promise<string | null> {
  if (siteId) return siteId;
  if (!domain) return null;

  const siteResult = await getSiteData(domain);
  return siteResult?.data?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const userContext = await getUserContext();
    if (!userContext?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    const siteId = await resolveSiteId(domain, searchParams.get("siteId"));

    if (!siteId) {
      return NextResponse.json(
        { error: "Domain or siteId is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("site_id", siteId)
      .eq("setting_key", INVENTORY_CATEGORIES_VIEW_MODE_KEY)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ viewMode: "table" satisfies CategoryViewMode });
    }

    return NextResponse.json({
      viewMode: normalizeViewMode(data?.setting_value),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userContext = await getUserContext();
    if (!userContext?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const siteId = await resolveSiteId(body.domain, body.siteId);
    const viewMode = normalizeViewMode(body.viewMode);

    if (!siteId) {
      return NextResponse.json(
        { error: "Domain or siteId is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.from("site_settings").upsert(
      {
        site_id: siteId,
        setting_key: INVENTORY_CATEGORIES_VIEW_MODE_KEY,
        setting_value: viewMode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "site_id,setting_key" },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, viewMode });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
