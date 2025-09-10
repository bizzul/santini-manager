import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { getSiteData } from "../../../../../lib/fetchers";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user from Supabase auth to verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, verniceStatus } = body;

    // Extract site_id from request headers or domain
    let siteId = null;
    const siteIdFromHeader = req.headers.get("x-site-id");
    const domain = req.headers.get("host");

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

    // Find task with site_id filtering if available
    let taskQuery = supabase
      .from("Task")
      .select("*")
      .eq("id", id);

    if (siteId) {
      taskQuery = taskQuery.eq("site_id", siteId);
    }

    const { data: task, error: findError } = await taskQuery.single();

    if (findError) throw findError;

    if (task) {
      let updateData: any = { vernice: verniceStatus };

      if (verniceStatus === true && task.vernice === false) {
        updateData.percentStatus = (task.percentStatus || 0) + 15;
      } else if (verniceStatus === false && task.vernice === true) {
        updateData.percentStatus = (task.percentStatus || 0) - 15;
      }

      // Update task with site_id filtering if available
      let updateQuery = supabase
        .from("Task")
        .update(updateData)
        .eq("id", id);

      if (siteId) {
        updateQuery = updateQuery.eq("site_id", siteId);
      }

      const { data: response, error: updateError } = await updateQuery
        .select()
        .single();

      if (updateError) throw updateError;

      if (response) {
        const actionData: any = {
          type: "updated_task",
          data: {
            taskId: id,
            vernice: response.vernice,
          },
          user_id: user.id,
          task_id: id,
        };

        // Add site_id if available
        if (siteId) {
          actionData.site_id = siteId;
        }

        const { data: newAction, error: actionError } = await supabase
          .from("Action")
          .insert(actionData)
          .select()
          .single();

        if (actionError) {
          console.error("Error creating action:", actionError);
        }

        return NextResponse.json({
          data: response,
          history: newAction,
          status: 200,
        });
      }
    }
  } catch (err) {
    return NextResponse.json({ err, status: 400 });
  }
}
