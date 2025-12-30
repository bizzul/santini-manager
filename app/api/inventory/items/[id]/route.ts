import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("InventoryItem");

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const supabase = await createClient();
        const { id } = await params;

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

        const { data: item, error } = await supabase
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
            .eq("id", id)
            .eq("site_id", siteId)
            .single();

        if (error) {
            log.error("Error fetching inventory item:", error);
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 },
            );
        }

        return NextResponse.json(item);
    } catch (err: unknown) {
        log.error("Error in get inventory item API:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const supabase = await createClient();
        const { id } = await params;
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
            is_stocked,
            is_consumable,
            is_active,
            // Variant fields (if variant_id provided)
            variant_id,
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
        } = body;

        // Update item
        const itemUpdate: Record<string, any> = {};
        if (name !== undefined) itemUpdate.name = name;
        if (description !== undefined) itemUpdate.description = description;
        if (item_type !== undefined) itemUpdate.item_type = item_type;
        if (category_id !== undefined) itemUpdate.category_id = category_id;
        if (supplier_id !== undefined) itemUpdate.supplier_id = supplier_id;
        if (is_stocked !== undefined) itemUpdate.is_stocked = is_stocked;
        if (is_consumable !== undefined) {
            itemUpdate.is_consumable = is_consumable;
        }
        if (is_active !== undefined) itemUpdate.is_active = is_active;

        if (Object.keys(itemUpdate).length > 0) {
            const { error: itemError } = await supabase
                .from("inventory_items")
                .update(itemUpdate)
                .eq("id", id)
                .eq("site_id", siteId);

            if (itemError) {
                log.error("Error updating inventory item:", itemError);
                return NextResponse.json(
                    { error: itemError.message },
                    { status: 500 },
                );
            }
        }

        // Update variant if variant_id provided
        if (variant_id) {
            const variantUpdate: Record<string, any> = {};
            if (internal_code !== undefined) {
                variantUpdate.internal_code = internal_code;
            }
            if (supplier_code !== undefined) {
                variantUpdate.supplier_code = supplier_code;
            }
            if (producer !== undefined) variantUpdate.producer = producer;
            if (producer_code !== undefined) {
                variantUpdate.producer_code = producer_code;
            }
            if (unit_id !== undefined) variantUpdate.unit_id = unit_id;
            if (purchase_unit_price !== undefined) {
                variantUpdate.purchase_unit_price = purchase_unit_price;
            }
            if (sell_unit_price !== undefined) {
                variantUpdate.sell_unit_price = sell_unit_price;
            }
            if (image_url !== undefined) variantUpdate.image_url = image_url;
            if (url_tds !== undefined) variantUpdate.url_tds = url_tds;
            if (warehouse_number !== undefined) {
                variantUpdate.warehouse_number = warehouse_number;
            }

            // Build attributes update
            const attributes: Record<string, any> = {};
            if (color !== undefined) attributes.color = color;
            if (color_code !== undefined) attributes.color_code = color_code;
            if (width !== undefined) attributes.width = width;
            if (height !== undefined) attributes.height = height;
            if (length !== undefined) attributes.length = length;
            if (thickness !== undefined) attributes.thickness = thickness;
            if (diameter !== undefined) attributes.diameter = diameter;
            if (category !== undefined) attributes.category = category;
            if (category_code !== undefined) {
                attributes.category_code = category_code;
            }
            if (subcategory !== undefined) attributes.subcategory = subcategory;
            if (subcategory_code !== undefined) {
                attributes.subcategory_code = subcategory_code;
            }
            if (subcategory2 !== undefined) {
                attributes.subcategory2 = subcategory2;
            }
            if (subcategory2_code !== undefined) {
                attributes.subcategory2_code = subcategory2_code;
            }

            if (Object.keys(attributes).length > 0) {
                // Merge with existing attributes
                const { data: existingVariant } = await supabase
                    .from("inventory_item_variants")
                    .select("attributes")
                    .eq("id", variant_id)
                    .single();

                variantUpdate.attributes = {
                    ...(existingVariant?.attributes || {}),
                    ...attributes,
                };
            }

            if (Object.keys(variantUpdate).length > 0) {
                const { error: variantError } = await supabase
                    .from("inventory_item_variants")
                    .update(variantUpdate)
                    .eq("id", variant_id)
                    .eq("site_id", siteId);

                if (variantError) {
                    log.error(
                        "Error updating inventory variant:",
                        variantError,
                    );
                    return NextResponse.json(
                        { error: variantError.message },
                        { status: 500 },
                    );
                }
            }
        }

        // Fetch updated item with relations
        const { data: updatedItem, error: fetchError } = await supabase
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
            .eq("id", id)
            .single();

        if (fetchError) {
            log.error("Error fetching updated item:", fetchError);
        }

        return NextResponse.json(updatedItem || { success: true });
    } catch (err: unknown) {
        log.error("Error in update inventory item API:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const supabase = await createClient();
        const { id } = await params;

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

        // Delete item (variants and movements will cascade)
        const { error } = await supabase
            .from("inventory_items")
            .delete()
            .eq("id", id)
            .eq("site_id", siteId);

        if (error) {
            log.error("Error deleting inventory item:", error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 },
            );
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        log.error("Error in delete inventory item API:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
