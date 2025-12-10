import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";

const DEFAULT_CONFIG = {
  enabled: true,
  days: 7,
};

// GET - Ottieni le impostazioni di auto-archiviazione per un site
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    let siteId = searchParams.get("siteId");

    if (!siteId && !domain) {
      return NextResponse.json(
        { error: "Domain or siteId is required" },
        { status: 400 },
      );
    }

    // Get site ID from domain if not provided directly
    if (!siteId && domain) {
      const siteResult = await getSiteData(domain);
      if (!siteResult?.data?.id) {
        return NextResponse.json(
          { error: "Site not found" },
          { status: 404 },
        );
      }
      siteId = siteResult.data.id;
    }
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("site_id", siteId)
      .eq("setting_key", "auto_archive")
      .single();

    if (error || !data) {
      return NextResponse.json(DEFAULT_CONFIG);
    }

    return NextResponse.json(data.setting_value);
  } catch (error) {
    console.error("Error in GET auto-archive:", error);
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

// POST - Salva le impostazioni di auto-archiviazione per un site
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, siteId: bodySiteId, config } = body;

    if (!bodySiteId && !domain) {
      return NextResponse.json(
        { error: "Domain or siteId is required" },
        { status: 400 },
      );
    }

    if (!config) {
      return NextResponse.json(
        { error: "Config is required" },
        { status: 400 },
      );
    }

    // Use siteId directly or get from domain
    let siteId = bodySiteId;
    if (!siteId && domain) {
      const siteResult = await getSiteData(domain);
      if (!siteResult?.data?.id) {
        return NextResponse.json(
          { error: "Site not found" },
          { status: 404 },
        );
      }
      siteId = siteResult.data.id;
    }
    const supabase = await createClient();

    const { error } = await supabase
      .from("site_settings")
      .upsert(
        {
          site_id: siteId,
          setting_key: "auto_archive",
          setting_value: config,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "site_id,setting_key" },
      );

    if (error) {
      console.error("Error saving auto-archive settings:", error);
      return NextResponse.json(
        { error: "Failed to save settings" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST auto-archive:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
