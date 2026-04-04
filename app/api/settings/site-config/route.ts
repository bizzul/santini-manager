import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const userContext = await getUserContext();
    if (!userContext || userContext.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");
    const settingKey = searchParams.get("settingKey");

    if (!siteId || !settingKey) {
      return NextResponse.json(
        { error: "siteId and settingKey are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("site_id", siteId)
      .eq("setting_key", settingKey)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ value: data?.setting_value ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userContext = await getUserContext();
    if (!userContext || userContext.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { siteId, settingKey, value } = body;

    if (!siteId || !settingKey) {
      return NextResponse.json(
        { error: "siteId and settingKey are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.from("site_settings").upsert(
      {
        site_id: siteId,
        setting_key: settingKey,
        setting_value: value ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "site_id,setting_key" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
