import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user from Supabase auth to verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ferramentaStatus } = body;

    const { data: task, error: findError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (findError) throw findError;

    if (task) {
      let updateData: any = { ferramenta: ferramentaStatus };

      if (ferramentaStatus === true && task.ferramenta === false) {
        console.log("adding ferramenta");
        // Adding 15% only if it hasn't been added before
        updateData.percent_status = (task.percent_status || 0) + 15;
      } else if (ferramentaStatus === false && task.ferramenta === true) {
        console.log("removing ferramenta");
        // Removing 15% only if it was added before
        updateData.percent_status = (task.percent_status || 0) - 15;
      } else {
        console.log("no change in ferramenta");
        // No change in percent_status
      }

      const { data: response, error: updateError } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (response) {
        // console.log(response);
        // Create a new Action record to track the user action
        const { data: newAction, error: actionError } = await supabase
          .from("actions")
          .insert({
            type: "updated_task",
            data: {
              taskId: id,
              ferramenta: response.ferramenta,
            },
            user_id: user.id,
            task_id: id,
          })
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
    // console.log(err);
    return NextResponse.json({ err, status: 400 });
  }
}
