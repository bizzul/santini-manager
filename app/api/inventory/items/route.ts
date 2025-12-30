import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("InventoryItems");

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();

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
            log.warn("Items API called without siteId");
            return NextResponse.json(
                { error: "Site ID required" },
                { status: 400 },
            );
        }

        // Fetch items with their variants and categories
        const { data: items, error } = await supabase
            .from("inventory_items")
            .select(`
                *,
                category:inventory_categories(*),
                supplier:inventory_suppliers(*),
                variants:inventory_item_variants(
                    *,
                    unit:inventory_units(*)
                )
            `)
            .eq("site_id", siteId)
            .eq("is_active", true)
            .order("name", { ascending: true });

        if (error) {
            log.error("Error fetching inventory items:", error);
            return NextResponse.json([], { status: 200 });
        }

        return NextResponse.json(items || []);
    } catch (err: unknown) {
        log.error("Error in inventory items API:", err);
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

        const {
            // Item fields
            name,
            description,
            item_type,
            category_id,
            supplier_id,
            is_stocked = true,
            is_consumable = true,
            is_active = true,
            // Variant fields
            internal_code,
            supplier_code,
            producer,
            producer_code,
            unit_id,
            purchase_unit_price,
            sell_unit_price,
            image_url,
            url_tds,
            warehouse_number,
            // Attributes
            color,
            color_code,
            width,
            height,
            length,
            thickness,
            diameter,
            category,
            category_code,
            subcategory,
            subcategory_code,
            subcategory2,
            subcategory2_code,
            // Initial stock
            initial_quantity = 0,
            warehouse_id,
        } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 },
            );
        }

        // Create item
        const { data: item, error: itemError } = await supabase
            .from("inventory_items")
            .insert({
                site_id: siteId,
                name,
                description: description || null,
                item_type: item_type || null,
                category_id: category_id || null,
                supplier_id: supplier_id || null,
                is_stocked,
                is_consumable,
                is_active,
            })
            .select()
            .single();

        if (itemError) {
            log.error("Error creating inventory item:", itemError);
            return NextResponse.json(
                { error: itemError.message },
                { status: 500 },
            );
        }

        // Build attributes object
        const attributes = {
            color: color || null,
            color_code: color_code || null,
            width: width || null,
            height: height || null,
            length: length || null,
            thickness: thickness || null,
            diameter: diameter || null,
            category: category || null,
            category_code: category_code || null,
            subcategory: subcategory || null,
            subcategory_code: subcategory_code || null,
            subcategory2: subcategory2 || null,
            subcategory2_code: subcategory2_code || null,
        };

        // Create variant
        const { data: variant, error: variantError } = await supabase
            .from("inventory_item_variants")
            .insert({
                item_id: item.id,
                site_id: siteId,
                internal_code: internal_code || null,
                supplier_code: supplier_code || null,
                producer: producer || null,
                producer_code: producer_code || null,
                unit_id: unit_id || null,
                purchase_unit_price: purchase_unit_price || null,
                sell_unit_price: sell_unit_price || null,
                attributes,
                image_url: image_url || null,
                url_tds: url_tds || null,
                warehouse_number: warehouse_number || null,
            })
            .select()
            .single();

        if (variantError) {
            log.error("Error creating inventory variant:", variantError);
            // Rollback item creation
            await supabase.from("inventory_items").delete().eq("id", item.id);
            return NextResponse.json(
                { error: variantError.message },
                { status: 500 },
            );
        }

        // Create initial stock movement if quantity > 0
        if (initial_quantity > 0) {
            const { error: movementError } = await supabase
                .from("inventory_stock_movements")
                .insert({
                    site_id: siteId,
                    variant_id: variant.id,
                    warehouse_id: warehouse_id || null,
                    movement_type: "opening",
                    quantity: initial_quantity,
                    unit_id: unit_id || null,
                    reason: "Stock iniziale",
                    reference_type: "manual",
                });

            if (movementError) {
                log.error("Error creating initial stock movement:", movementError);
                // Continue anyway, stock can be adjusted later
            }
        }

        return NextResponse.json({
            item,
            variant,
        });
    } catch (err: unknown) {
        log.error("Error in create inventory item API:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

