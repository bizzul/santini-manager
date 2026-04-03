import { NextRequest, NextResponse } from "next/server";
import { generateDemoMagicLink } from "@/lib/demo/service";

function extractContext(request: NextRequest) {
    return {
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            null,
        userAgent: request.headers.get("user-agent"),
        referrer: request.headers.get("referer"),
        country: request.headers.get("x-vercel-ip-country"),
        city: request.headers.get("x-vercel-ip-city"),
        landingPath: request.nextUrl.pathname,
    };
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ token: string }> },
) {
    const { token } = await context.params;
    const result = await generateDemoMagicLink(token, extractContext(request));

    if (!result.ok) {
        return NextResponse.redirect(new URL(`/demo/${token}`, request.url));
    }

    return NextResponse.redirect(result.actionLink);
}
