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
      // Errortracking uses employee_id (User.id integer), not user_id
      let employeeId: number | undefined;
      if (data.data.user) {
        const parsed = Number(data.data.user);
        if (!Number.isNaN(parsed)) {
          employeeId = parsed; // ID numerico da form desktop
        } else {
          // Auth UUID da mobile page (session.user.sub)
          const { data: userRow } = await supabase
            .from("User")
            .select("id")
            .eq("authId", data.data.user)
            .maybeSingle();
          employeeId = userRow?.id;
        }
      } else {
        const { data: userRow } = await supabase
          .from("User")
          .select("id")
          .eq("authId", user.id)
          .maybeSingle();
        employeeId = userRow?.id;
      }
      if (!employeeId) {
        return NextResponse.json(
          { error: "Utente non trovato nel database" },
          { status: 400 }
        );
      }

      // Create the error tracking record
      const { data: result, error: createError } = await supabase
        .from("Errortracking")
        .insert({
          description: data.data.description ?? "",
          error_category: data.data.errorCategory,
          error_type: data.data.errorType ?? "",
          supplier_id: data.data.supplier ? Number(data.data.supplier) : null,
          task_id: Number(data.data.task),
          employee_id: employeeId,
          position: data.data.position || null,
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
