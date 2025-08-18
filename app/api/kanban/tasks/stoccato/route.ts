import { createClient } from "../../../../../utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get the current user from Supabase auth to verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, stoccatoStatus, stoccatoDate } = body;

    const { data: updatedTask, error: updateError } = await supabase
      .from("tasks")
      .update({
        stoccato: stoccatoStatus,
        stoccaggiodate: stoccatoDate ? new Date(stoccatoDate) : null,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    const { error: actionError } = await supabase
      .from("actions")
      .insert({
        type: "updated_task",
        data: {
          taskId: id,
          stoccato: stoccatoStatus,
        },
        user_id: user.id,
        task_id: id,
      });

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
