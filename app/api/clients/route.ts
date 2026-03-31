import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { logger } from "@/lib/logger";
import { validation } from "@/validation/clients/create";

const log = logger.scope("Clients");

function normalizeCountryCode(value: string) {
    const normalizedValue = value.trim().toUpperCase();

    if (["CH", "SVIZZERA", "SWITZERLAND", "SUISSE"].includes(normalizedValue)) {
        return "CH";
    }

    if (["IT", "ITALIA", "ITALY"].includes(normalizedValue)) {
        return "IT";
    }

    if (["DE", "GERMANIA", "GERMANY"].includes(normalizedValue)) {
        return "DE";
    }

    if (["FR", "FRANCIA", "FRANCE"].includes(normalizedValue)) {
        return "FR";
    }

    return normalizedValue;
}

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { siteId } = await getSiteContext(req);

        // In multi-tenant, siteId is required
        if (!siteId) {
            log.warn("Clients API called without siteId");
            return NextResponse.json(
                { error: "Site ID required" },
                { status: 400 },
            );
        }

        // Query directly with site filter
        const { data, error } = await supabase
            .from("Client")
            .select("*")
            .eq("site_id", siteId);

        if (error) {
            log.error("Error fetching clients:", error);
            throw error;
        }

        return NextResponse.json(data);
    } catch (err: unknown) {
        log.error("Clients API error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 },
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { siteId } = await getSiteContext(req);
        if (!siteId) {
            return NextResponse.json(
                { error: "Site ID required" },
                { status: 400 }
            );
        }

        const payload = await req.json();
        const result = validation.safeParse(payload);

        if (!result.success) {
            return NextResponse.json(
                {
                    error: "Validation failed",
                    details: result.error.issues,
                },
                { status: 400 }
            );
        }

        const { data: siteData, error: siteError } = await supabase
            .from("sites")
            .select("id, organization_id")
            .eq("id", siteId)
            .single();

        if (siteError || !siteData) {
            return NextResponse.json(
                { error: "Site not found" },
                { status: 404 }
            );
        }

        const clientType = result.data.clientType || "BUSINESS";
        const baseCode =
            (clientType === "BUSINESS"
                ? result.data.businessName
                : `${result.data.individualFirstName || ""}${result.data.individualLastName || ""}`) ||
            "CL";
        const generatedCode = baseCode
            .replace(/\s+/g, "")
            .toUpperCase()
            .slice(0, 4) || "CL";

        const insertData: Record<string, unknown> = {
            individualTitle:
                clientType === "INDIVIDUAL" ? result.data.individualTitle || "" : "",
            businessName:
                clientType === "BUSINESS" ? result.data.businessName || "" : "",
            individualFirstName:
                clientType === "INDIVIDUAL"
                    ? result.data.individualFirstName || ""
                    : "",
            individualLastName:
                clientType === "INDIVIDUAL"
                    ? result.data.individualLastName || ""
                    : "",
            address: result.data.address,
            addressSecondary: result.data.addressSecondary || "",
            city: result.data.city,
            countryCode: normalizeCountryCode(result.data.countryCode),
            email: result.data.email || "",
            mobilePhone: result.data.phone || "",
            landlinePhone: result.data.phone || "",
            zipCode: result.data.zipCode,
            clientLanguage: result.data.clientLanguage || "",
            clientType,
            code: generatedCode,
            site_id: siteId,
            organization_id: siteData.organization_id,
        };

        const { data: createdClient, error: createError } = await supabase
            .from("Client")
            .insert(insertData)
            .select("*")
            .single();

        if (createError) {
            log.error("Error creating client:", createError);
            return NextResponse.json(
                { error: createError.message },
                { status: 500 }
            );
        }

        const { error: actionError } = await supabase.from("Action").insert({
            type: "client_create",
            data: {
                clientId: createdClient.id,
                source: "voice_command",
            },
            user_id: user.id,
            site_id: siteId,
            organization_id: siteData.organization_id,
        });

        if (actionError) {
            log.error("Error creating client action:", actionError);
        }

        return NextResponse.json({
            success: true,
            data: createdClient,
        });
    } catch (err: unknown) {
        log.error("Clients POST API error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        );
    }
}
