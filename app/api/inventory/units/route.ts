import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { logger } from "@/lib/logger";

const log = logger.scope("InventoryUnits");

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Units are global (not site-specific)
        const { data: units, error } = await supabase
            .from("inventory_units")
            .select("*")
            .order("name", { ascending: true });

        if (error) {
            log.error("Error fetching inventory units:", error);
            return NextResponse.json([], { status: 200 });
        }

        return NextResponse.json(units || []);
    } catch (err: unknown) {
        log.error("Error in inventory units API:", err);
        return NextResponse.json([], { status: 200 });
    }
}

