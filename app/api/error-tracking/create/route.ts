import { createClient } from "../../../../utils/supabase/server";
import { validation } from "../../../../validation/errorTracking/create"; //? <--- The validation schema
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized", status: 401 });
    }

    const body = await req.json();
    const data = validation.safeParse(body); //? <---Veryfing body against validation schema

    if (data.success) {
      // Create the error tracking record
      const { data: result, error: createError } = await supabase
        .from("Errortracking")
        .insert({
          description: data.data.description ?? "",
          error_category: data.data.errorCategory,
          error_type: data.data.errorType ?? "",
          supplier_id: data.data.supplier ? Number(data.data.supplier) : null,
          position: data.data.position,
          task_id: Number(data.data.task),
          user_id: user.id,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Success
      if (result) {
        if (
          body.fileIds && Array.isArray(body.fileIds) && body.fileIds.length > 0
        ) {
          // Save the Cloudinary IDs of the uploaded files to the task record
          await Promise.all(
            body.fileIds.map((fileId: number) => {
              return supabase
                .from("files")
                .update({ errortracking_id: result.id })
                .eq("id", fileId);
            }),
          );
        }

        // Create a new Action record to track the user action
        const { data: newAction, error: actionError } = await supabase
          .from("Action")
          .insert({
            type: "errortracking_create",
            data: {
              errorTracking: result.id,
            },
            user_id: user.id,
          })
          .select()
          .single();

        if (actionError) {
          console.error("Error creating action:", actionError);
        }

        return NextResponse.json({ data, status: 200 });
      } else {
        return NextResponse.json({
          error: "Failed to create error tracking",
          status: 500,
        });
      }
    } else {
      //Input invalid
      return NextResponse.json({ error: data.error, status: 400 });
    }
  } catch (error) {
    console.error("Error in error tracking create API:", error);
    return NextResponse.json({
      error: "Internal server error",
      status: 500,
    });
  }
}
