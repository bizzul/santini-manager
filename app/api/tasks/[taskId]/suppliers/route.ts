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
    const { supplierId, deliveryDate, orderDate, notes } = await request.json();

    const { data: existingSupplier, error: findError } = await supabase
      .from("TaskSupplier")
      .select("*")
      .eq("taskId", parseInt(taskId))
      .eq("supplierId", supplierId)
      .single();

    if (findError && findError.code !== "PGRST116") throw findError;

    if (existingSupplier) {
      // Build update object with only provided fields
      const updateData: {
        deliveryDate?: Date | null;
        orderDate?: Date | null;
        notes?: string;
      } = {};
      if (deliveryDate !== undefined) {
        updateData.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
      }
      if (orderDate !== undefined) {
        updateData.orderDate = orderDate ? new Date(orderDate) : null;
      }
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const runUpdate = async (payload: Record<string, any>) =>
        supabase
          .from("TaskSupplier")
          .update(payload)
          .eq("id", existingSupplier.id)
          .select(`
            *,
            supplier:Supplier(*)
          `)
          .single();

      let { data: updatedSupplier, error: updateError } = await runUpdate(updateData);

      if (
        updateError &&
        (updateError.code === "42703" || updateError.message?.includes("orderDate"))
      ) {
        delete updateData.orderDate;
        ({ data: updatedSupplier, error: updateError } = await runUpdate(updateData));
      }

      if (updateError) throw updateError;
      return NextResponse.json(updatedSupplier);
    }

    const insertData: Record<string, any> = {
      taskId: parseInt(taskId),
      supplierId: supplierId,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      orderDate: orderDate ? new Date(orderDate) : null,
      notes: notes || null,
    };

    const runInsert = async (payload: Record<string, any>) =>
      supabase
        .from("TaskSupplier")
        .insert(payload)
        .select(`
          *,
          supplier:Supplier(*)
        `)
        .single();

    let { data: taskSupplier, error: createError } = await runInsert(insertData);

    if (
      createError &&
      (createError.code === "42703" || createError.message?.includes("orderDate"))
    ) {
      delete insertData.orderDate;
      ({ data: taskSupplier, error: createError } = await runInsert(insertData));
    }

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
