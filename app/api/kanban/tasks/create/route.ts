import { createClient } from "../../../../../utils/supabase/server";
import { validation } from "../../../../../validation/task/create"; //? <--- The validation schema
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = validation.safeParse(body); //? <---Veryfing body against validation schema

    if (result.success) {
      // Get kanban and column IDs
      const { data: kanban, error: kanbanError } = await supabase
        .from("kanbans")
        .select("id")
        .eq("identifier", "PRODUCTION")
        .single();

      if (kanbanError) throw kanbanError;

      const { data: column, error: columnError } = await supabase
        .from("kanban_columns")
        .select("id")
        .eq("identifier", "TODOPROD")
        .single();

      if (columnError) throw columnError;

      // create an array of positions from the request body
      // if a position is not provided, it defaults to an empty string
      const positions = Array.from(
        { length: 8 },
        //@ts-ignore
        (_, i) => result.data[`position${i + 1}`] || "",
      );

      const { data: taskCreate, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: "",
          client_id: result.data.clientId,
          delivery_date: result.data.deliveryDate,
          unique_code: result.data.unique_code,
          sell_product_id: result.data.productId,
          name: result.data.name,
          kanban_id: kanban.id,
          column_id: column.id,
          sell_price: result.data.sellPrice,
          other: result.data.other,
          positions: positions,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Success
      if (taskCreate) {
        if (body.fileIds !== null) {
          // Save the Cloudinary IDs of the uploaded files to the task record
          await Promise.all(
            body.fileIds.map((fileId: number) => {
              return supabase
                .from("files")
                .update({ task_id: taskCreate.id })
                .eq("id", fileId);
            }),
          );
        }

        // Create a new Action record to track the user action
        const { data: newAction, error: actionError } = await supabase
          .from("actions")
          .insert({
            type: "task_create",
            data: {
              task: taskCreate.id,
            },
            user_id: user.id,
            task_id: taskCreate.id,
          })
          .select()
          .single();

        if (actionError) {
          console.error("Error creating action:", actionError);
        }

        return NextResponse.json({ taskCreate, status: 200 });
      } else {
        return NextResponse.json({ error: result, status: 500 });
      }
    } else {
      //Input invalid
      return NextResponse.json({ error: "Error", status: 400 });
    }
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
