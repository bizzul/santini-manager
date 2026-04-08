import { getKanbans } from "@/app/sites/[domain]/kanban/actions/get-kanbans.action";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Extract site context from headers or query parameters
    const { searchParams } = new URL(req.url);
    const domainFromQuery = searchParams.get("domain");
    const siteIdFromHeader = req.headers.get("x-site-id");

    // Build options for getKanbans - prioritize siteId from header, then domain from query
    const kanbans = await getKanbans({
      siteId: siteIdFromHeader || undefined,
      domain: domainFromQuery || undefined,
    });

    return NextResponse.json(kanbans, {
      headers: {
        // Short SWR cache to reduce repeated hot-path queries while keeping UI fresh.
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15",
      },
    });
  } catch (error) {
    console.error("Error in kanban list API:", error);
    return NextResponse.json(
      { error: "Failed to fetch kanbans" },
      { status: 500 },
    );
  }
}
