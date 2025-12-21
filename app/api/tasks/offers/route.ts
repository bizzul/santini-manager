import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("OffersAPI");

/**
 * API per ottenere le offerte disponibili per il collegamento a progetti
 * Restituisce task con task_type = 'OFFERTA' che non sono già collegati
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { siteId } = await getSiteContext(req);

    if (!siteId) {
      log.warn("Offers API called without siteId");
      return NextResponse.json(
        { error: "Site ID required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const excludeLinked = searchParams.get("excludeLinked") !== "false"; // default true

    log.debug("Fetching offers", { siteId, search, excludeLinked });

    // Fetch offers (tasks with task_type = 'OFFERTA')
    let query = supabase
      .from("Task")
      .select(`
        id,
        unique_code,
        name,
        task_type,
        created_at,
        clientId,
        clients:clientId(id, businessName, individualFirstName, individualLastName)
      `)
      .eq("site_id", siteId)
      .eq("task_type", "OFFERTA")
      .eq("archived", false)
      .order("created_at", { ascending: false });

    // Search filter
    if (search) {
      query = query.or(`unique_code.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { data: offers, error } = await query;

    if (error) {
      log.error("Error fetching offers:", error);
      throw error;
    }

    // If excludeLinked is true, filter out offers that are already linked to a project
    let availableOffers = offers || [];

    if (excludeLinked && availableOffers.length > 0) {
      const offerIds = availableOffers.map((o) => o.id);

      // Find tasks that have these offers as parent_task_id
      const { data: linkedOffers } = await supabase
        .from("Task")
        .select("parent_task_id")
        .in("parent_task_id", offerIds)
        .eq("archived", false);

      const linkedOfferIds = new Set(
        (linkedOffers || []).map((t) => t.parent_task_id)
      );

      // Filter out already linked offers
      availableOffers = availableOffers.filter(
        (offer) => !linkedOfferIds.has(offer.id)
      );
    }

    // Format response
    const formattedOffers = availableOffers.map((offer) => {
      const client = offer.clients as any;
      const clientName = client
        ? client.businessName ||
          `${client.individualFirstName || ""} ${client.individualLastName || ""}`.trim()
        : null;

      return {
        id: offer.id,
        unique_code: offer.unique_code,
        name: offer.name,
        clientName,
        created_at: offer.created_at,
        label: `${offer.unique_code}${clientName ? ` - ${clientName}` : ""}`,
      };
    });

    return NextResponse.json({
      offers: formattedOffers,
      total: formattedOffers.length,
    });
  } catch (error: any) {
    log.error("Error in offers API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

