import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * API per gestire le categorie dei SellProduct
 */

// GET: Ottieni tutte le categorie
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");
    const domain = searchParams.get("domain");

    const supabase = await createClient();

    let actualSiteId = siteId;

    // Ottieni siteId dal domain se necessario
    if (!actualSiteId && domain) {
      // Prova prima con il domain completo
      let { data: site } = await supabase
        .from("Site")
        .select("id")
        .eq("domain", domain)
        .single();

      // Se non trovato, prova con la parte principale del domain (es: santini.localhost -> santini)
      if (!site) {
        const baseDomain = domain.split(".")[0];
        const { data: siteByBase } = await supabase
          .from("Site")
          .select("id")
          .eq("domain", baseDomain)
          .single();
        site = siteByBase;
      }

      if (site) {
        actualSiteId = site.id;
      }
    }

    if (!actualSiteId) {
      return NextResponse.json(
        { error: "siteId or domain is required" },
        { status: 400 },
      );
    }

    const { data: categories, error } = await supabase
      .from("sellproduct_categories")
      .select("*")
      .eq("site_id", actualSiteId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      categories: categories || [],
      siteId: actualSiteId,
    });
  } catch (error) {
    console.error("Error in categories GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: Crea una nuova categoria
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, name, description, color } = body;

    if (!siteId || !name) {
      return NextResponse.json(
        { error: "siteId and name are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: category, error } = await supabase
      .from("sellproduct_categories")
      .insert({
        site_id: siteId,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#3B82F6",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        return NextResponse.json(
          { error: "Una categoria con questo nome esiste già" },
          { status: 409 },
        );
      }
      console.error("Error creating category:", error);
      return NextResponse.json(
        { error: "Failed to create category" },
        { status: 500 },
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Error in categories POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT: Aggiorna una categoria
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, color } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "id and name are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: category, error } = await supabase
      .from("sellproduct_categories")
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#3B82F6",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Una categoria con questo nome esiste già" },
          { status: 409 },
        );
      }
      console.error("Error updating category:", error);
      return NextResponse.json(
        { error: "Failed to update category" },
        { status: 500 },
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Error in categories PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE: Elimina una categoria
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("sellproduct_categories")
      .delete()
      .eq("id", parseInt(id));

    if (error) {
      console.error("Error deleting category:", error);
      return NextResponse.json(
        { error: "Failed to delete category" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in categories DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
