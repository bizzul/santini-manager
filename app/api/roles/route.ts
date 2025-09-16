import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";

export const GET = async (req: NextRequest) => {
  try {
    const supabase = await createClient();
    const userContext = await getUserContext();

    if (!userContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow admin and superadmin access
    if (userContext.role !== "admin" && userContext.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organization_id");

    let query = supabase.from("Roles").select("*");

    // For now, we'll get all roles since the Roles table has site_id
    // In the future, we might want to add organization_id to the Roles table
    // or create a mapping between organizations and sites

    const { data: roles, error } = await query;

    if (error) throw error;

    return NextResponse.json({ roles });
  } catch (err: any) {
    console.error("Error fetching roles:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const supabase = await createClient();
    const userContext = await getUserContext();

    if (!userContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow admin and superadmin access
    if (userContext.role !== "admin" && userContext.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, organization_id } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Role name is required" }, {
        status: 400,
      });
    }

    // For now, we'll create roles without site_id since we're working at organization level
    // In the future, we might want to add organization_id to the Roles table
    const { data: role, error } = await supabase
      .from("Roles")
      .insert({ name })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ role });
  } catch (err: any) {
    console.error("Error creating role:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
