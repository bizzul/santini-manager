import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "@/lib/fetchers";
import { getUserContext } from "@/lib/auth-utils";
import { canAccessModule, isAdminOrSuperadmin } from "@/lib/permissions";
import { fetchTreemapSensorReadings } from "@/lib/treemap-data";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ domain: string; sensoreId: string }>;
  },
) {
  try {
    const { domain, sensoreId } = await params;
    const siteResponse = await getSiteData(domain);
    if (!siteResponse?.data) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const userContext = await getUserContext();
    if (!userContext?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteId = siteResponse.data.id;

    if (!isAdminOrSuperadmin(userContext.role)) {
      const allowed = await canAccessModule(
        userContext.userId || userContext.user.id,
        siteId,
        "treemap",
        userContext.role,
      );
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const readings = await fetchTreemapSensorReadings(siteId, sensoreId);
    return NextResponse.json({ readings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
