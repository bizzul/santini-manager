import { createClient } from "../../../../../utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "../../../../../lib/fetchers";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user from Supabase auth to verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, stoccatoStatus, stoccatoDate } = body;

    // Extract site_id from request headers or domain
    let siteId = null;
    const siteIdFromHeader = request.headers.get("x-site-id");
    const domain = request.headers.get("host");

    if (siteIdFromHeader) {
      siteId = siteIdFromHeader;
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

    // Update task with site_id filtering if available
    let updateQuery = supabase
      .from("Task")
      .update({
        stoccato: stoccatoStatus,
        stoccaggiodate: stoccatoDate ? new Date(stoccatoDate) : null,
      })
      .eq("id", id);

    if (siteId) {
      updateQuery = updateQuery.eq("site_id", siteId);
    }

    const { data: updatedTask, error: updateError } = await updateQuery
      .select()
      .single();

    if (updateError) throw updateError;

    const actionData: any = {
      type: "updated_task",
      data: {
        taskId: id,
        stoccato: stoccatoStatus,
      },
      user_id: user.id,
      task_id: id,
    };

    // Add site_id if available
    if (siteId) {
      actionData.site_id = siteId;
    }

    const { error: actionError } = await supabase
      .from("Action")
      .insert(actionData);

    if (actionError) {
      console.error("Error creating action:", actionError);
    }

    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error) {
    console.error("Error updating stoccato status:", error);
    return NextResponse.json(
      { error: "Failed to update stoccato status" },
      { status: 500 },
    );
  }
}
