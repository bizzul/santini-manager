import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth-utils";
import { bearerTokenFromRequest } from "@/utils/supabase/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Prefer this tab's Bearer token so the identity is the tab's own user,
    // not whatever the shared cookie currently holds. Falls back to cookies.
    const token = bearerTokenFromRequest(request);
    const userContext = token
      ? await getUserContext(token)
      : await getUserContext();

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
