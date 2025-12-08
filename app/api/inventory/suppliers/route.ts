import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("Suppliers");

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
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

    // Query directly with site filter - no conditional needed
    const { data: suppliers, error } = await supabase
      .from("Supplier")
      .select("*")
      .eq("site_id", siteId)
      .order("name", { ascending: true });

    if (error) {
      log.error("Error fetching suppliers:", error);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(suppliers || []);
  } catch (err: unknown) {
    log.error("Error in suppliers API:", err);
    return NextResponse.json([], { status: 200 });
  }
}
