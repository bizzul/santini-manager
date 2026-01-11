import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("InventoryCategories");

export async function GET(req: NextRequest) {
    try {
        const supabase = createServiceClient();

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

        // Query new inventory_categories table
        const { data: categories, error } = await supabase
            .from("inventory_categories")
            .select("*")
            .eq("site_id", siteId)
            .order("name", { ascending: true });

        if (error) {
            log.error("Error fetching inventory categories:", error);
            return NextResponse.json([], { status: 200 });
        }

        return NextResponse.json(categories || []);
    } catch (err: unknown) {
        log.error("Error in inventory categories API:", err);
        return NextResponse.json([], { status: 200 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = createServiceClient();
        const body = await req.json();

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
            return NextResponse.json(
                { error: "Site ID required" },
                { status: 400 },
            );
        }

        const { name, code, description, parent_id } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 },
            );
        }

        const { data: category, error } = await supabase
            .from("inventory_categories")
            .insert({
                site_id: siteId,
                name,
                code: code || null,
                description: description || null,
                parent_id: parent_id || null,
            })
            .select()
            .single();

        if (error) {
            log.error("Error creating inventory category:", error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 },
            );
        }

        return NextResponse.json(category);
    } catch (err: unknown) {
        log.error("Error in create inventory category API:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

export async function PUT(req: NextRequest) {
    try {
        const supabase = createServiceClient();
        const body = await req.json();

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
            return NextResponse.json(
                { error: "Site ID required" },
                { status: 400 },
            );
        }

        const { id, name, code, description, parent_id } = body;

        if (!id || !name) {
            return NextResponse.json(
                { error: "ID and name are required" },
                { status: 400 },
            );
        }

        const { data: category, error } = await supabase
            .from("inventory_categories")
            .update({
                name,
                code: code || null,
                description: description || null,
                parent_id: parent_id || null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("site_id", siteId)
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json(
                    { error: "Una categoria con questo nome esiste già" },
                    { status: 409 },
                );
            }
            log.error("Error updating inventory category:", error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 },
            );
        }

        return NextResponse.json(category);
    } catch (err: unknown) {
        log.error("Error in update inventory category API:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const supabase = createServiceClient();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

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
            return NextResponse.json(
                { error: "Site ID required" },
                { status: 400 },
            );
        }

        if (!id) {
            return NextResponse.json(
                { error: "ID is required" },
                { status: 400 },
            );
        }

        // Check if the category is used by any inventory items
        const { data: itemsUsingCategory, error: checkError } = await supabase
            .from("inventory_items")
            .select("id")
            .eq("category_id", id)
            .eq("site_id", siteId)
            .limit(1);

        if (checkError) {
            log.error("Error checking category usage:", checkError);
            return NextResponse.json(
                { error: "Failed to check category usage" },
                { status: 500 },
            );
        }

        if (itemsUsingCategory && itemsUsingCategory.length > 0) {
            return NextResponse.json(
                {
                    error:
                        "Impossibile eliminare la categoria perché è utilizzata da uno o più articoli. Riassegna o elimina prima quegli articoli.",
                },
                { status: 400 },
            );
        }

        const { error } = await supabase
            .from("inventory_categories")
            .delete()
            .eq("id", id)
            .eq("site_id", siteId);

        if (error) {
            log.error("Error deleting inventory category:", error);
            return NextResponse.json(
                { error: "Failed to delete category" },
                { status: 500 },
            );
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        log.error("Error in delete inventory category API:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
