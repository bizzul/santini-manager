import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "@/lib/fetchers";
import { fetchCountryDashboardData } from "@/lib/country-dashboard.server";

/**
 * Per-country dashboard payload (KPI/pipeline/department stats + facts),
 * consumed on-demand by the country dashboard overlay when a capital point
 * is clicked. GET `?iso2=IT`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  try {
    const { domain } = await params;
    const { searchParams } = new URL(request.url);
    const iso2 = searchParams.get("iso2") || "";

    if (!iso2) {
      return NextResponse.json({ error: "iso2 is required" }, { status: 400 });
    }

    const response = await getSiteData(domain);
    if (!response?.data) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const data = await fetchCountryDashboardData(response.data.id, iso2);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
