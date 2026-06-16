import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import {
  diagramLayoutsKey,
  parseDiagramLayouts,
} from "@/lib/diagram-layouts";

/**
 * Per-site diagram layouts (node positions). Shared across the site and
 * editable by any authenticated user (cosmetic, low-risk data).
 */
export async function GET(request: NextRequest) {
  try {
    const userContext = await getUserContext();
    if (!userContext?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");
    const diagramKey = searchParams.get("key");

    if (!siteId || !diagramKey) {
      return NextResponse.json(
        { error: "siteId and key are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("site_id", siteId)
      .eq("setting_key", diagramLayoutsKey(diagramKey))
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ value: parseDiagramLayouts(data?.setting_value) });
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
    const { siteId, key, value } = body ?? {};

    if (!siteId || !key) {
      return NextResponse.json(
        { error: "siteId and key are required" },
        { status: 400 },
      );
    }

    // Sanitize before persisting so malformed payloads cannot poison the row.
    const sanitized = parseDiagramLayouts(value);

    const supabase = await createClient();
    const { error } = await supabase.from("site_settings").upsert(
      {
        site_id: siteId,
        setting_key: diagramLayoutsKey(key),
        setting_value: sanitized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "site_id,setting_key" },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, value: sanitized });
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
