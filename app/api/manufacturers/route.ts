import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("Manufacturers");

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { siteId } = await getSiteContext(req);

        // In multi-tenant, siteId is required
        if (!siteId) {
            log.warn("Manufacturers API called without siteId");
            return NextResponse.json(
                { error: "Site ID required" },
                { status: 400 },
            );
        }

        // Query directly with site filter, including category relation
        const { data: manufacturers, error } = await supabase
            .from("Manufacturer")
            .select(
                "*, manufacturer_category:manufacturer_category_id(id, name, code)",
            )
            .eq("site_id", siteId)
            .order("name", { ascending: true });

        if (error) {
            log.error("Error fetching manufacturers:", error);
            throw error;
        }

        return NextResponse.json(manufacturers || []);
    } catch (error: unknown) {
        log.error("Manufacturers API error:", error);
        return NextResponse.json(
            { error: "Error fetching manufacturers" },
            { status: 500 },
        );
    }
}
