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
      .from("task_suppliers")
      .select(`
        *,
        suppliers:supplier_id(*)
      `)
      .eq("task_id", parseInt(taskId));

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
      .from("task_suppliers")
      .select("*")
      .eq("task_id", parseInt(taskId))
      .eq("supplier_id", supplierId)
      .single();

    if (findError && findError.code !== "PGRST116") throw findError;

    if (existingSupplier) {
      const { data: updatedSupplier, error: updateError } = await supabase
        .from("task_suppliers")
        .update({ delivery_date: new Date(deliveryDate) })
        .eq("id", existingSupplier.id)
        .select(`
          *,
          suppliers:supplier_id(*)
        `)
        .single();

      if (updateError) throw updateError;
      return NextResponse.json(updatedSupplier);
    }

    const { data: taskSupplier, error: createError } = await supabase
      .from("task_suppliers")
      .insert({
        task_id: parseInt(taskId),
        supplier_id: supplierId,
        delivery_date: new Date(deliveryDate),
      })
      .select(`
        *,
        suppliers:supplier_id(*)
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
