"use server";
import { createClient } from "@/utils/supabase/server";

export async function requireSuperAdmin() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        throw new Error("Authentication required");
    }

    const { data: userRole } = await supabase
        .from("tenants")
        .select("role")
        .eq("user_id", user.id)
        .single();

    if (!userRole || userRole.role !== "superadmin") {
        throw new Error("Unauthorized: Requires superadmin role");
    }

    return user;
}
