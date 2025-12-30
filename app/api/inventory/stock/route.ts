import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("InventoryStock");

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
            log.warn("Stock API called without siteId");
            return NextResponse.json(
                { error: "Site ID required" },
                { status: 400 },
            );
        }

        // Fetch stock from the view
        const { data: stock, error } = await supabase
            .from("inventory_stock")
            .select("*")
            .eq("site_id", siteId);

        if (error) {
            log.error("Error fetching inventory stock:", error);
            return NextResponse.json([], { status: 200 });
        }

        return NextResponse.json(stock || []);
    } catch (err: unknown) {
        log.error("Error in inventory stock API:", err);
        return NextResponse.json([], { status: 200 });
    }
}

// POST for stock movements
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
            variant_id,
            warehouse_id,
            movement_type,
            quantity,
            unit_id,
            reason,
            reference_type,
            reference_id,
        } = body;

        if (!variant_id || !movement_type || quantity === undefined) {
            return NextResponse.json(
                { error: "variant_id, movement_type, and quantity are required" },
                { status: 400 },
            );
        }

        // Validate movement_type
        const validTypes = ['opening', 'in', 'out', 'adjust', 'transfer_in', 'transfer_out'];
        if (!validTypes.includes(movement_type)) {
            return NextResponse.json(
                { error: `Invalid movement_type. Must be one of: ${validTypes.join(', ')}` },
                { status: 400 },
            );
        }

        // For 'out' movements, check current stock
        if (movement_type === 'out') {
            const { data: currentStock } = await supabase
                .from("inventory_stock")
                .select("quantity")
                .eq("variant_id", variant_id)
                .eq("warehouse_id", warehouse_id)
                .maybeSingle();

            const availableQty = currentStock?.quantity || 0;
            if (quantity > availableQty) {
                return NextResponse.json(
                    { error: `Quantità insufficiente. Disponibili: ${availableQty}` },
                    { status: 400 },
                );
            }
        }

        const { data: movement, error } = await supabase
            .from("inventory_stock_movements")
            .insert({
                site_id: siteId,
                variant_id,
                warehouse_id: warehouse_id || null,
                movement_type,
                quantity: Math.abs(quantity), // Always store positive
                unit_id: unit_id || null,
                reason: reason || null,
                reference_type: reference_type || 'manual',
                reference_id: reference_id || null,
            })
            .select()
            .single();

        if (error) {
            log.error("Error creating stock movement:", error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 },
            );
        }

        return NextResponse.json(movement);
    } catch (err: unknown) {
        log.error("Error in create stock movement API:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

