import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("Suppliers");

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { siteId } = await getSiteContext(req);

        // In multi-tenant, siteId is required
        if (!siteId) {
            log.warn("Suppliers API called without siteId");
            return NextResponse.json(
                { error: "Site ID required" },
                { status: 400 },
            );
        }

        // Query directly with site filter
        const { data: suppliers, error } = await supabase
            .from("Supplier")
            .select("*")
            .eq("site_id", siteId)
            .order("name", { ascending: true });

        if (error) {
            log.error("Error fetching suppliers:", error);
            throw error;
        }

        return NextResponse.json(suppliers || []);
    } catch (error: unknown) {
        log.error("Suppliers API error:", error);
        return NextResponse.json(
            { error: "Error fetching suppliers" },
            { status: 500 },
        );
    }
}
