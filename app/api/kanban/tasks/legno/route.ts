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
    const { id, legnoStatus } = body;

    const { data: task, error: findError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (findError) throw findError;

    if (task) {
      let updateData: any = { legno: legnoStatus };

      if (legnoStatus === true && task.legno === false) {
        updateData.percent_status = (task.percent_status || 0) + 15;
      } else if (legnoStatus === false && task.legno === true) {
        updateData.percent_status = (task.percent_status || 0) - 15;
      }

      const { data: response, error: updateError } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (response) {
        const { data: newAction, error: actionError } = await supabase
          .from("actions")
          .insert({
            type: "updated_task",
            data: {
              taskId: id,
              legno: response.legno,
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
    return NextResponse.json({ err, status: 400 });
  }
}
