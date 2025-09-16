import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "@/lib/fetchers";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const domain = searchParams.get("domain");

        if (!domain) {
            return NextResponse.json(
                { error: "Domain parameter is required" },
                {
                    status: 400,
                },
            );
        }

        const response = await getSiteData(domain);
        if (!response?.data) {
            return NextResponse.json({ error: "Site not found" }, {
                status: 404,
            });
        }

        return NextResponse.json(response.data);
    } catch (error) {
        console.error("Error in domain API:", error);
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}
