import { createClient } from "../../../../../utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: number }> },
) {
  const { id: taskId } = await params;
  try {
    const supabase = await createClient();

    // Fetch a single task
    const { data: task, error } = await supabase
      .from("tasks")
      .select(`
        *,
        kanbans:kanban_id(*),
        clients:client_id(*),
        users:user_id(*),
        kanban_columns:column_id(*),
        files(*),
        sell_products:sell_product_id(*)
      `)
      .eq("id", Number(taskId))
      .single();

    if (error) throw error;

    // console.log("project", task);
    if (task) {
      return NextResponse.json({ task, status: 200 });
    } else {
      return NextResponse.json({ message: "Client not found", status: 404 });
    }
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json({ message: "Internal server error", status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const taskId = await req.json();

    //Fetch a single task
    // console.log(req.body);
    const { data: task, error: findError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", Number(taskId))
      .single();

    if (findError) throw findError;

    if (task) {
      const { data: taskData, error: updateError } = await supabase
        .from("tasks")
        .update({})
        .eq("id", Number(taskId))
        .select()
        .single();

      if (updateError) throw updateError;

      return NextResponse.json({
        stato: "UPDATED",
        task: taskData,
        status: 200,
      });
    }
    return NextResponse.json({
      message: "The product not exist.",
      status: 404,
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json({ message: "Internal server error", status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const productId = await req.json();

    const { data: product, error: findError } = await supabase
      .from("products")
      .select("*")
      .eq("id", Number(productId))
      .single();

    if (findError) throw findError;

    if (product) {
      //Removing product
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", Number(productId));

      if (deleteError) throw deleteError;

      return NextResponse.json({
        stato: "DELETED",
        product: product,
        status: 200,
      });
    }

    return NextResponse.json({
      message: "The product id not exist.",
      status: 404,
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ message: "Internal server error", status: 500 });
  }
}
