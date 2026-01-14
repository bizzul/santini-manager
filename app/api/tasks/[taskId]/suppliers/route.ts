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
    const { supplierId, deliveryDate, notes } = await request.json();

    const { data: existingSupplier, error: findError } = await supabase
      .from("TaskSupplier")
      .select("*")
      .eq("taskId", parseInt(taskId))
      .eq("supplierId", supplierId)
      .single();

    if (findError && findError.code !== "PGRST116") throw findError;

    if (existingSupplier) {
      // Build update object with only provided fields
      const updateData: { deliveryDate?: Date; notes?: string } = {};
      if (deliveryDate !== undefined) {
        updateData.deliveryDate = new Date(deliveryDate);
      }
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const { data: updatedSupplier, error: updateError } = await supabase
        .from("TaskSupplier")
        .update(updateData)
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
        notes: notes || null,
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
