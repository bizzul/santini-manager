import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("Products");

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        
        // Try to get site context from header first, then from request
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
            log.warn("Products API called without siteId");
            return NextResponse.json(
                { error: "Site ID required" },
                { status: 400 },
            );
        }

        // Query products with site filter
        const { data, error } = await supabase
            .from("Product")
            .select("*")
            .eq("site_id", siteId);

        if (error) {
            log.error("Error fetching products:", error);
            throw error;
        }

        return NextResponse.json(data || []);
    } catch (err: unknown) {
        log.error("Products API error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 },
        );
    }
}

