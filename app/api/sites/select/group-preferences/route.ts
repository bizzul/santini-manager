import { NextRequest, NextResponse } from "next/server";
import { getUserContext, getUserSites } from "@/lib/auth-utils";
import { createClient } from "@/utils/supabase/server";

type SiteGroupKey = "active" | "custom" | "beta" | "alpha";

const VALID_GROUP_KEYS: SiteGroupKey[] = ["active", "custom", "beta", "alpha"];

const isSiteGroupKey = (value: string): value is SiteGroupKey =>
  VALID_GROUP_KEYS.includes(value as SiteGroupKey);

export async function POST(request: NextRequest) {
  try {
    const userContext = await getUserContext();
    const userId = userContext?.userId || userContext?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (userContext.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const siteId =
      typeof body?.siteId === "string" ? body.siteId.trim() : "";
    const groupKeyRaw =
      typeof body?.groupKey === "string" ? body.groupKey.trim().toLowerCase() : "";

    if (!siteId || !isSiteGroupKey(groupKeyRaw)) {
      return NextResponse.json(
        { error: "siteId and valid groupKey are required" },
        { status: 400 }
      );
    }

    const accessibleSites = await getUserSites();
    const hasAccess = accessibleSites.some(
      (site: any) => String(site.id) === siteId
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Non hai accesso a questo spazio" },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.from("user_site_select_preferences").upsert(
      {
        user_id: userId,
        site_id: siteId,
        group_key: groupKeyRaw,
      },
      { onConflict: "user_id,site_id" }
    );

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to save preference" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
