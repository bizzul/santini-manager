import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("Clients");

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { siteId } = await getSiteContext(req);

        // In multi-tenant, siteId is required
        if (!siteId) {
            log.warn("Clients API called without siteId");
            return NextResponse.json(
                { error: "Site ID required" },
                { status: 400 },
            );
        }

        // Query directly with site filter
        const { data, error } = await supabase
            .from("Client")
            .select("*")
            .eq("site_id", siteId);

        if (error) {
            log.error("Error fetching clients:", error);
            throw error;
        }

        return NextResponse.json(data);
    } catch (err: unknown) {
        log.error("Clients API error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 },
        );
    }
}
