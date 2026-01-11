import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("InventorySuppliers");

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Check for x-site-domain header first (used by client components)
    const siteDomain = req.headers.get("x-site-domain");
    let siteId: string | null = null;

    if (siteDomain) {
      const context = await getSiteContextFromDomain(siteDomain);
      siteId = context.siteId;
    } else {
      const context = await getSiteContext(req);
      siteId = context.siteId;
    }

    // In multi-tenant, siteId is required
    if (!siteId) {
      log.warn("Suppliers API called without siteId");
      return NextResponse.json(
        { error: "Site ID required" },
        { status: 400 },
      );
    }

    // Query new inventory_suppliers table
    const { data: suppliers, error } = await supabase
      .from("inventory_suppliers")
      .select("*")
      .eq("site_id", siteId)
      .order("name", { ascending: true });

    if (error) {
      log.error("Error fetching inventory suppliers:", error);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(suppliers || []);
  } catch (err: unknown) {
    log.error("Error in inventory suppliers API:", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await req.json();

    // Check for x-site-domain header first
    const siteDomain = req.headers.get("x-site-domain");
    let siteId: string | null = null;

    if (siteDomain) {
      const context = await getSiteContextFromDomain(siteDomain);
      siteId = context.siteId;
    } else {
      const context = await getSiteContext(req);
      siteId = context.siteId;
    }

    if (!siteId) {
      return NextResponse.json(
        { error: "Site ID required" },
        { status: 400 },
      );
    }

    const {
      name,
      code,
      notes,
      short_name,
      address,
      location,
      phone,
      email,
      website,
      contact,
      cap,
      supplier_image,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    const { data: supplier, error } = await supabase
      .from("inventory_suppliers")
      .insert({
        site_id: siteId,
        name,
        code: code || null,
        notes: notes || null,
        short_name: short_name || null,
        address: address || null,
        location: location || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        contact: contact || null,
        cap: cap || null,
        supplier_image: supplier_image || null,
      })
      .select()
      .single();

    if (error) {
      log.error("Error creating inventory supplier:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(supplier);
  } catch (err: unknown) {
    log.error("Error in create inventory supplier API:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
