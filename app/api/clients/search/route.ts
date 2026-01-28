import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Search for clients by name (for voice input matching)
 * Clients can be businesses (businessName) or individuals (individualFirstName + individualLastName)
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Check authentication
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = req.nextUrl.searchParams;
        const name = searchParams.get("name");
        const siteId = searchParams.get("siteId");

        if (!name || !siteId) {
            return NextResponse.json(
                { error: "name and siteId are required" },
                { status: 400 }
            );
        }

        const searchTerm = name.trim().toLowerCase();

        // Get all clients for this site and search in memory
        // (more flexible than SQL for searching across multiple name fields)
        const { data: clients } = await supabase
            .from("Client")
            .select("id, businessName, individualFirstName, individualLastName, clientType, address, city, zipCode")
            .eq("site_id", siteId);

        if (!clients || clients.length === 0) {
            return NextResponse.json({
                found: false,
                suggestions: [],
            });
        }

        // Helper to get display name
        const getDisplayName = (client: typeof clients[0]) => {
            if (client.clientType === "BUSINESS" && client.businessName) {
                return client.businessName;
            }
            const parts = [client.individualFirstName, client.individualLastName].filter(Boolean);
            return parts.join(" ") || client.businessName || "";
        };

        // Search for exact match (case-insensitive)
        const exactMatch = clients.find(c => {
            const displayName = getDisplayName(c).toLowerCase();
            return displayName === searchTerm;
        });

        if (exactMatch) {
            return NextResponse.json({
                found: true,
                client: {
                    id: exactMatch.id,
                    name: getDisplayName(exactMatch),
                    address: exactMatch.address,
                    city: exactMatch.city,
                    zipCode: exactMatch.zipCode,
                },
            });
        }

        // Search for partial match
        const partialMatches = clients.filter(c => {
            const displayName = getDisplayName(c).toLowerCase();
            return displayName.includes(searchTerm) || searchTerm.includes(displayName);
        }).slice(0, 5);

        if (partialMatches.length > 0) {
            // If there's only one partial match, return it as found
            if (partialMatches.length === 1) {
                const match = partialMatches[0];
                return NextResponse.json({
                    found: true,
                    client: {
                        id: match.id,
                        name: getDisplayName(match),
                        address: match.address,
                        city: match.city,
                        zipCode: match.zipCode,
                    },
                });
            }

            return NextResponse.json({
                found: false,
                suggestions: partialMatches.map(c => ({
                    id: c.id,
                    name: getDisplayName(c),
                    address: c.address,
                    city: c.city,
                    zipCode: c.zipCode,
                })),
            });
        }

        return NextResponse.json({
            found: false,
            suggestions: [],
        });
    } catch (error) {
        console.error("Error searching clients:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
