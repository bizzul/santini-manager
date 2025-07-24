import { getKanbans } from "@/app/sites/[domain]/kanban/actions/get-kanbans.action";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const kanbans = await getKanbans();

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
