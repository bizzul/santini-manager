import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("InternalActivities");

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

        // Fetch activities - both global (site_id IS NULL) and site-specific
        let query = supabase
            .from("internal_activities")
            .select("id, code, label, site_id, sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        // If we have a site context, get both global and site-specific activities
        if (siteId) {
            query = query.or(`site_id.is.null,site_id.eq.${siteId}`);
        } else {
            // No site context - only get global activities
            query = query.is("site_id", null);
        }

        const { data, error } = await query;

        if (error) {
            log.error("Error fetching internal activities:", error);
            return NextResponse.json(
                { error: "Failed to fetch internal activities" },
                { status: 500 },
            );
        }

        return NextResponse.json(data || []);
    } catch (err: unknown) {
        log.error("Error in internal activities API:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 },
        );
    }
}
