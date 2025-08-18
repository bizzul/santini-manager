import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "@/lib/fetchers";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> },
) {
    try {
        const { domain } = await params;
        const response = await getSiteData(domain);
        if (!response?.data) {
            return NextResponse.json({ error: "Site not found" }, {
                status: 404,
            });
        }
        const { name, organization_id } = response.data;
        return NextResponse.json({ name, organization_id });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}
