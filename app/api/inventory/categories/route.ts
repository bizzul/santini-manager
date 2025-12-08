import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("Categories");

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
            log.warn("Categories API called without siteId");
            return NextResponse.json(
                { error: "Site ID required" },
                { status: 400 },
            );
        }

        // Query directly with site filter
        const { data: categories, error } = await supabase
            .from("Product_category")
            .select("*")
            .eq("site_id", siteId)
            .order("name", { ascending: true });

        if (error) {
            log.error("Error fetching categories:", error);
            return NextResponse.json([], { status: 200 });
        }

        return NextResponse.json(categories || []);
    } catch (err: unknown) {
        log.error("Error in categories API:", err);
        return NextResponse.json([], { status: 200 });
    }
}
