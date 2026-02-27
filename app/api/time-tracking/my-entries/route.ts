import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "@/lib/fetchers";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", status: 401 },
        { status: 401 }
      );
    }

    // Get the internal user ID from auth ID
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("id")
      .eq("authId", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "User not found", status: 404 },
        { status: 404 }
      );
    }

    const employeeId = userData.id;

    // Extract site_id from headers or domain
    let siteId = null;
    const siteIdHeader = req.headers.get("x-site-id");
    const domain = req.headers.get("host");

    if (siteIdHeader) {
      siteId = siteIdHeader;
    } else if (domain) {
      try {
        const siteResult = await getSiteData(domain);
        if (siteResult?.data) {
          siteId = siteResult.data.id;
        }
      } catch (error) {
        console.error("Error fetching site data:", error);
      }
    }

    // Build query
    let query = supabase
      .from("Timetracking")
      .select(`
        id,
        hours,
        minutes,
        totalTime,
        description,
        description_type,
        activity_type,
        internal_activity,
        created_at,
        task:task_id(unique_code, client:Client(businessName)),
        roles:_RolesToTimetracking(role:Roles(id, name))
      `)
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });

    // Apply site filter if available
    if (siteId) {
      query = query.eq("site_id", siteId);
    }

    const { data: entries, error: entriesError } = await query;

    if (entriesError) {
      console.error("Error fetching timetracking entries:", entriesError);
      return NextResponse.json(
        {
          error: "Failed to fetch entries",
          details: entriesError.message,
          status: 500,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      entries: entries || [],
      status: 200,
    });
  } catch (error) {
    console.error("Error in time-tracking my-entries:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        status: 500,
      },
      { status: 500 }
    );
  }
}
