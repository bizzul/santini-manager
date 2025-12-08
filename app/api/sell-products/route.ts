import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("SellProducts");

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { siteId } = await getSiteContext(req);

        // In multi-tenant, siteId is required
        if (!siteId) {
            log.warn("SellProducts API called without siteId");
            return NextResponse.json(
                { error: "Site ID required" },
                { status: 400 },
            );
        }

        // Query directly with site filter
        const { data, error } = await supabase
            .from("SellProduct")
            .select("*")
            .eq("site_id", siteId)
            .eq("active", true);

        if (error) {
            log.error("Error fetching sell products:", error);
            throw error;
        }

        return NextResponse.json(data);
    } catch (err: unknown) {
        log.error("SellProducts API error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 },
        );
    }
}
