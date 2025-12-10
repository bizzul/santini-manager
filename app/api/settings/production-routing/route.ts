import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * API per gestire il routing produzione
 * Mappa le categorie prodotto alle kanban di produzione
 */

// GET: Ottieni le categorie prodotto e le kanban disponibili per il routing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return NextResponse.json(
        { error: "siteId is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Ottieni le categorie prodotto dalla tabella sellproduct_categories
    const { data: categoryData, error: categoriesError } = await supabase
      .from("sellproduct_categories")
      .select("id, name")
      .eq("site_id", siteId)
      .order("name", { ascending: true });

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 },
      );
    }

    // Estrai nomi categorie
    const categories = categoryData?.map((c) => c.name) || [];

    // Ottieni tutte le kanban marcate come "produzione" (possono essere multiple)
    const { data: productionKanbans, error: kanbansError } = await supabase
      .from("Kanban")
      .select("id, title, identifier")
      .eq("site_id", siteId)
      .eq("is_production_kanban", true)
      .order("title", { ascending: true });

    if (kanbansError) {
      console.error("Error fetching production kanbans:", kanbansError);
    }

    // Ottieni il routing salvato
    const { data: routingSetting, error: routingError } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("site_id", siteId)
      .eq("setting_key", "production_routing")
      .single();

    if (routingError && routingError.code !== "PGRST116") {
      console.error("Error fetching routing:", routingError);
    }

    return NextResponse.json({
      categories: categories || [],
      productionKanbans: productionKanbans || [],
      routing: routingSetting?.setting_value || {},
    });
  } catch (error) {
    console.error("Error in production-routing GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: Salva il mapping categoria -> kanban produzione
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, routing } = body;

    if (!siteId) {
      return NextResponse.json(
        { error: "siteId is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Salva il routing nelle site_settings
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        {
          site_id: siteId,
          setting_key: "production_routing",
          setting_value: routing,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "site_id,setting_key",
        },
      );

    if (error) {
      console.error("Error saving production routing:", error);
      return NextResponse.json(
        { error: "Failed to save routing" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in production-routing POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
