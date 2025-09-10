import { getKanbans } from "@/app/sites/[domain]/kanban/actions/get-kanbans.action";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Extract domain from request headers
    const domain = req.headers.get("host");
    const kanbans = await getKanbans(domain || undefined);

    const response = NextResponse.json(kanbans);

    // Add cache control headers to prevent stale data
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate",
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Error in kanban list API:", error);
    return NextResponse.json(
      { error: "Failed to fetch kanbans" },
      { status: 500 },
    );
  }
}
