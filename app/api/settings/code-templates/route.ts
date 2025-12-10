import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { CodeTemplate, DEFAULT_TEMPLATES } from "@/lib/code-generator";

// GET - Ottieni i template dei codici per un site
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    let siteId = searchParams.get("siteId");

    // Se non c'è siteId, prova con domain
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

    // Cerca i template salvati
    const { data, error } = await supabase
      .from("site_settings")
      .select("setting_key, setting_value")
      .eq("site_id", siteId)
      .like("setting_key", "code_template_%");

    if (error) {
      console.error("Error fetching templates:", error);
      // Ritorna i default
      return NextResponse.json(DEFAULT_TEMPLATES);
    }

    // Costruisci l'oggetto template
    const templates: Record<string, CodeTemplate> = { ...DEFAULT_TEMPLATES };

    data?.forEach((item) => {
      const taskType = item.setting_key.replace("code_template_", "")
        .toUpperCase();
      templates[taskType] = item.setting_value as CodeTemplate;
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error in GET code-templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Salva i template dei codici per un site
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, siteId: bodySliteId, templates } = body;

    if (!bodySliteId && !domain) {
      return NextResponse.json(
        { error: "Domain or siteId is required" },
        { status: 400 },
      );
    }

    if (!templates) {
      return NextResponse.json(
        { error: "Templates are required" },
        { status: 400 },
      );
    }

    // Use siteId directly or get from domain
    let siteId = bodySliteId;
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

    // Salva ogni template
    const upsertPromises = Object.entries(templates).map(
      ([taskType, template]) => {
        return supabase
          .from("site_settings")
          .upsert(
            {
              site_id: siteId,
              setting_key: `code_template_${taskType.toLowerCase()}`,
              setting_value: template,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "site_id,setting_key" },
          );
      },
    );

    const results = await Promise.all(upsertPromises);

    // Controlla errori
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error("Errors saving templates:", errors);
      return NextResponse.json(
        { error: "Failed to save some templates" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST code-templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
