import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("InventoryWarehouses");

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();

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
            log.warn("Warehouses API called without siteId");
            return NextResponse.json(
                { error: "Site ID required" },
                { status: 400 },
            );
        }

        const { data: warehouses, error } = await supabase
            .from("inventory_warehouses")
            .select("*")
            .eq("site_id", siteId)
            .order("name", { ascending: true });

        if (error) {
            log.error("Error fetching inventory warehouses:", error);
            return NextResponse.json([], { status: 200 });
        }

        return NextResponse.json(warehouses || []);
    } catch (err: unknown) {
        log.error("Error in inventory warehouses API:", err);
        return NextResponse.json([], { status: 200 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await req.json();

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

        const { name, description, code } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 },
            );
        }

        const { data: warehouse, error } = await supabase
            .from("inventory_warehouses")
            .insert({
                site_id: siteId,
                name,
                description: description || null,
                code: code || null,
            })
            .select()
            .single();

        if (error) {
            log.error("Error creating warehouse:", error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 },
            );
        }

        return NextResponse.json(warehouse);
    } catch (err: unknown) {
        log.error("Error in create warehouse API:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

