import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";

export const GET = async (req: NextRequest) => {
  try {
    const supabase = await createClient();
    const userContext = await getUserContext();

    if (!userContext) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("site_id");
    const organizationId = searchParams.get("organization_id");

    let query = supabase.from("Roles").select("*");

    // Filter by site_id if provided
    if (siteId) {
      query = query.or(`site_id.eq.${siteId},site_id.is.null`);
    }

    const { data: roles, error } = await query.order("name");

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
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Only allow admin and superadmin access
    if (userContext.role !== "admin" && userContext.role !== "superadmin") {
      return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
    }

    const { name, site_id, organization_id } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Il nome del ruolo è obbligatorio" }, {
        status: 400,
      });
    }

    // Create role with optional site_id
    const { data: role, error } = await supabase
      .from("Roles")
      .insert({ name, site_id: site_id || null })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ role });
  } catch (err: any) {
    console.error("Error creating role:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
