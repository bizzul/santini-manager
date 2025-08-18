import { createClient } from "../../../../utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user from Supabase auth to verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all roles from Supabase
    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("id, name");

    if (rolesError) throw rolesError;

    const formattedRoles = roles.map((role: any) => {
      return { id: role.id, name: role.name };
    });

    return NextResponse.json({ roles: formattedRoles, status: 200 });
  } catch (error: any) {
    console.error(error);
    const errorMessage = error.message || "An error occurred";
    return NextResponse.json({ error: errorMessage, status: 400 });
  }
}
