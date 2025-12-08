import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("Kanban");

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug: filteredKanban } = await params;

    try {
        const supabase = await createClient();
        const { siteId } = await getSiteContext(req);

        // In multi-tenant, siteId is required
        if (!siteId) {
            log.warn("Kanban API called without siteId");
            return NextResponse.json(
                { error: "Site ID required" },
                { status: 400 },
            );
        }

        // Query directly with site filter
        const { data: kanban, error: kanbanError } = await supabase
            .from("Kanban")
            .select("*")
            .eq("identifier", filteredKanban)
            .eq("site_id", siteId)
            .single();

        if (kanbanError) {
            log.warn("Kanban not found:", filteredKanban);
            return NextResponse.json(
                { error: "Kanban not found" },
                { status: 404 },
            );
        }

        // Get columns for this kanban
        const { data: columns, error: columnsError } = await supabase
            .from("KanbanColumn")
            .select("*")
            .eq("kanbanId", kanban.id)
            .order("position", { ascending: true });

        if (columnsError) {
            log.error("Error fetching columns:", columnsError);
            return NextResponse.json(
                { error: "Failed to fetch columns" },
                { status: 500 },
            );
        }

        // Return kanban with columns
        return NextResponse.json({
            ...kanban,
            columns: columns || [],
        });
    } catch (error) {
        log.error("Error in kanban API:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
