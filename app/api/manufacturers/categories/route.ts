import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("ManufacturerCategories");

export async function GET(req: NextRequest) {
    try {
        const supabase = createServiceClient();

        // Check for x-site-domain header first (used by CategorySelector)
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
            log.warn("Manufacturer Categories API called without siteId");
            return NextResponse.json(
                { error: "Site ID required" },
                { status: 400 },
            );
        }

        // Query directly with site filter
        const { data: categories, error } = await supabase
            .from("Manufacturer_category")
            .select("*")
            .eq("site_id", siteId)
            .order("name", { ascending: true });

        if (error) {
            log.error("Error fetching manufacturer categories:", error);
            throw error;
        }

        return NextResponse.json(categories || []);
    } catch (error: unknown) {
        log.error("Manufacturer Categories API error:", error);
        return NextResponse.json(
            { error: "Error fetching manufacturer categories" },
            { status: 500 },
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = createServiceClient();

        // Check for x-site-domain header first (used by CategorySelector)
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

        const body = await req.json();
        const { name, code, description } = body;

        if (!name || !description) {
            return NextResponse.json(
                { error: "Name and description are required" },
                { status: 400 },
            );
        }

        const { data, error } = await supabase
            .from("Manufacturer_category")
            .insert({
                name,
                code: code || null,
                description,
                site_id: siteId,
            })
            .select()
            .single();

        if (error) {
            log.error("Error creating manufacturer category:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error: unknown) {
        log.error("Manufacturer Categories POST error:", error);
        return NextResponse.json(
            { error: "Error creating manufacturer category" },
            { status: 500 },
        );
    }
}
