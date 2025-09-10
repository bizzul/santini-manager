import { createClient } from "../../../../../utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const supabase = await createClient();
    const { taskId } = await params;

    const { data: taskSuppliers, error } = await supabase
      .from("TaskSupplier")
      .select(`
        *,
        supplier:Supplier(*)
      `)
      .eq("taskId", parseInt(taskId));

    if (error) throw error;

    return NextResponse.json(taskSuppliers);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error fetching task suppliers", message: error },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const supabase = await createClient();
    const { taskId } = await params;
    const { supplierId, deliveryDate } = await request.json();

    const { data: existingSupplier, error: findError } = await supabase
      .from("TaskSupplier")
      .select("*")
      .eq("taskId", parseInt(taskId))
      .eq("supplierId", supplierId)
      .single();

    if (findError && findError.code !== "PGRST116") throw findError;

    if (existingSupplier) {
      const { data: updatedSupplier, error: updateError } = await supabase
        .from("TaskSupplier")
        .update({ deliveryDate: new Date(deliveryDate) })
        .eq("id", existingSupplier.id)
        .select(`
          *,
          supplier:Supplier(*)
        `)
        .single();

      if (updateError) throw updateError;
      return NextResponse.json(updatedSupplier);
    }

    const { data: taskSupplier, error: createError } = await supabase
      .from("TaskSupplier")
      .insert({
        taskId: parseInt(taskId),
        supplierId: supplierId,
        deliveryDate: new Date(deliveryDate),
      })
      .select(`
        *,
        supplier:Supplier(*)
      `)
      .single();

    if (createError) throw createError;

    return NextResponse.json(taskSupplier);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error managing task supplier" },
      { status: 500 },
    );
  }
}
