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
    const { id, metalliStatus } = body;

    const { data: task, error: findError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (findError) throw findError;

    if (task) {
      let updateData: any = { metalli: metalliStatus };

      if (metalliStatus === true && task.metalli === false) {
        console.log("adding metalli");
        // Adding 10% only if it hasn't been added before
        updateData.percent_status = (task.percent_status || 0) + 10;
      } else if (metalliStatus === false && task.metalli === true) {
        console.log("removing metalli");
        // Removing 10% only if it was added before
        updateData.percent_status = (task.percent_status || 0) - 10;
      } else {
        console.log("no change in metalli");
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
              metalli: response.metalli,
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
