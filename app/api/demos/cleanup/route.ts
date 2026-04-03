import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth-utils";
import { cleanupExpiredDemoWorkspaces } from "@/lib/demo/service";

function hasValidCleanupSecret(request: NextRequest) {
    const secret = process.env.DEMO_CLEANUP_SECRET;

    if (!secret) {
        return false;
    }

    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null;
    const queryToken = request.nextUrl.searchParams.get("secret");

    return bearerToken === secret || queryToken === secret;
}

export async function POST(request: NextRequest) {
    const userContext = await getUserContext().catch(() => null);
    const isAuthorized = hasValidCleanupSecret(request) ||
        !!userContext?.canAccessAllOrganizations;

    if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const retentionDays = Number(body?.retentionDays || 30);
    const result = await cleanupExpiredDemoWorkspaces(retentionDays);

    return NextResponse.json({
        ok: true,
        ...result,
    });
}
