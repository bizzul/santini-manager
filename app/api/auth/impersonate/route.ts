import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { getUserContext } from "@/lib/auth-utils";

export async function POST(request: NextRequest) {
    const { userId } = await request.json();
    const context = await getUserContext();
    if (!context || context.role !== "superadmin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (context.user.id === userId) {
        return NextResponse.json({ error: "Cannot impersonate yourself" }, {
            status: 400,
        });
    }
    // Check target user role
    const supabase = await createClient();
    const { data: targetTenant } = await supabase
        .from("tenants")
        .select("role")
        .eq("user_id", userId)
        .single();
    if (!targetTenant || targetTenant.role === "superadmin") {
        return NextResponse.json({ error: "Cannot impersonate this user" }, {
            status: 400,
        });
    }
    // Set impersonation cookie
    const cookieStore = await cookies();
    cookieStore.set(
        "impersonation",
        JSON.stringify({ originalId: context.user.id, targetId: userId }),
        {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            // Optionally set secure and domain
        },
    );
    return NextResponse.json({ success: true });
}
