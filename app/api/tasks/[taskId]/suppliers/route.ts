import { createClient } from "../../../../../utils/supabase/server";
import { NextResponse } from "next/server";

function normalizeSupplyDays(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsedValue =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (Number.isNaN(parsedValue)) {
    return null;
  }

  return Math.max(parsedValue, 0);
}

function isMissingColumnError(
  error: { code?: string; message?: string } | null,
  columnName: string
) {
  return Boolean(
    error &&
      (error.code === "42703" || error.message?.includes(columnName))
  );
}

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
    const { supplierId, deliveryDate, orderDate, notes, supplyDays } =
      await request.json();
    const normalizedSupplyDays = normalizeSupplyDays(supplyDays);

    const { data: existingSupplier, error: findError } = await supabase
      .from("TaskSupplier")
      .select("*")
      .eq("taskId", parseInt(taskId))
      .eq("supplierId", supplierId)
      .single();

    if (findError && findError.code !== "PGRST116") throw findError;

    if (existingSupplier) {
      // Build update object with only provided fields
      const updateData: Record<string, any> = {};
      if (deliveryDate !== undefined) {
        updateData.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
      }
      if (orderDate !== undefined) {
        updateData.orderDate = orderDate ? new Date(orderDate) : null;
      }
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      if (normalizedSupplyDays !== undefined) {
        updateData.supplyDays = normalizedSupplyDays;
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

      for (const columnName of ["orderDate", "supplyDays"] as const) {
        if (!isMissingColumnError(updateError, columnName)) {
          continue;
        }

        delete updateData[columnName];
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
      supplyDays: normalizedSupplyDays ?? null,
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

    for (const columnName of ["orderDate", "supplyDays"] as const) {
      if (!isMissingColumnError(createError, columnName)) {
        continue;
      }

      delete insertData[columnName];
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
