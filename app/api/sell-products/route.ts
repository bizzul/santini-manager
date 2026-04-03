import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { logger } from "@/lib/logger";
import { validation } from "@/validation/sellProducts/create";

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

        // Query directly with site filter, include category relation
        const { data, error } = await supabase
            .from("SellProduct")
            .select(`
                *,
                category:sellproduct_categories(id, name)
            `)
            .eq("site_id", siteId)
            .eq("active", true);

        if (error) {
            log.error("Error fetching sell products:", error);
            throw error;
        }

        // Sort by category name (alphabetically), then by product name
        const sortedData = data ? [...data].sort((a, b) => {
            const catA = a.category?.name?.toLowerCase() || "";
            const catB = b.category?.name?.toLowerCase() || "";
            if (catA !== catB) {
                return catA.localeCompare(catB, "it");
            }
            const nameA = a.name?.toLowerCase() || "";
            const nameB = b.name?.toLowerCase() || "";
            return nameA.localeCompare(nameB, "it");
        }) : [];

        return NextResponse.json(sortedData);
    } catch (err: unknown) {
        log.error("SellProducts API error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 },
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { siteId } = await getSiteContext(req);
        if (!siteId) {
            log.warn("SellProducts POST API called without siteId");
            return NextResponse.json(
                { error: "Site ID required" },
                { status: 400 }
            );
        }

        const payload = await req.json();
        const result = validation.safeParse(payload);

        if (!result.success) {
            return NextResponse.json(
                {
                    error: "Validation failed",
                    details: result.error.issues,
                },
                { status: 400 }
            );
        }

        const { data: category, error: categoryError } = await supabase
            .from("sellproduct_categories")
            .select("id, name")
            .eq("site_id", siteId)
            .eq("name", result.data.category)
            .single();

        if (categoryError || !category) {
            return NextResponse.json(
                { error: "Categoria prodotto non trovata" },
                { status: 400 }
            );
        }

        const insertData = {
            name: result.data.name,
            type: result.data.type || null,
            description: result.data.description || null,
            price_list: result.data.price_list ?? false,
            image_url: result.data.image_url || null,
            doc_url: result.data.doc_url || null,
            active: result.data.active ?? true,
            category_id: category.id,
            site_id: siteId,
        };

        const { data: createdProduct, error: createError } = await supabase
            .from("SellProduct")
            .insert(insertData)
            .select("*")
            .single();

        if (createError) {
            log.error("Error creating sell product:", createError);
            return NextResponse.json(
                { error: createError.message },
                { status: 500 }
            );
        }

        const { error: actionError } = await supabase.from("Action").insert({
            type: "sell_product_create",
            data: {
                sellProductId: createdProduct.id,
                source: "voice_command",
            },
            user_id: user.id,
            site_id: siteId,
        });

        if (actionError) {
            log.error("Error creating sell product action:", actionError);
        }

        return NextResponse.json({
            success: true,
            data: createdProduct,
        });
    } catch (err: unknown) {
        log.error("SellProducts POST API error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        );
    }
}
