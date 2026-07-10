import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth-utils";
import {
    removeUserFromOrganization,
    removeUserFromSite,
} from "@/app/(administration)/administration/actions";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> },
) {
    try {
        const { userId } = await params;

        const userContext = await getUserContext();
        if (
            !userContext ||
            (userContext.role !== "admin" && userContext.role !== "superadmin")
        ) {
            return NextResponse.json({ error: "Insufficient permissions" }, {
                status: 403,
            });
        }

        const { type, id } = await req.json();

        if (!id || (type !== "organization" && type !== "site")) {
            return NextResponse.json(
                { error: "Invalid request: expected type 'organization' or 'site' and an id" },
                { status: 400 },
            );
        }

        if (type === "organization") {
            await removeUserFromOrganization(userId, id);
        } else {
            await removeUserFromSite(userId, id);
        }

        return NextResponse.json({
            success: true,
            message: `Access to ${type} removed successfully`,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error
                    ? error.message
                    : "Failed to remove access",
            },
            { status: 500 },
        );
    }
}
