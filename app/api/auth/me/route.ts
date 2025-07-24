import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userContext = await getUserContext();

    if (!userContext) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json(userContext);
  } catch (error) {
    console.error("Error fetching user context:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
