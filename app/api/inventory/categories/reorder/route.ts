import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";
import { getSiteContext, getSiteContextFromDomain } from "@/lib/site-context";
import { logger } from "@/lib/logger";

const log = logger.scope("InventoryCategoryReorder");

async function resolveSiteId(req: NextRequest): Promise<string | null> {
  const siteDomain = req.headers.get("x-site-domain");
  if (siteDomain) {
    const context = await getSiteContextFromDomain(siteDomain);
    return context.siteId;
  }
  const context = await getSiteContext(req);
  return context.siteId;
}

export async function PATCH(req: NextRequest) {
  try {
    const userContext = await getUserContext();
    if (!userContext?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminOrSuperadmin(userContext.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const siteId = await resolveSiteId(req);
    if (!siteId) {
      return NextResponse.json({ error: "Site ID required" }, { status: 400 });
    }

    const body = await req.json();
    const orderedIds = Array.isArray(body?.orderedIds)
      ? body.orderedIds.filter((id: unknown) => typeof id === "string")
      : [];

    if (orderedIds.length === 0) {
      return NextResponse.json(
        { error: "orderedIds is required" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    const updates = orderedIds.map((id: string, index: number) =>
      supabase
        .from("inventory_categories")
        .update({
          sort_order: index,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("site_id", siteId),
    );

    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);

    if (failed?.error) {
      log.error("Category reorder error:", failed.error);
      return NextResponse.json(
        { error: "Failed to reorder categories: " + failed.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    log.error("Category reorder error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
