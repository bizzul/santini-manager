import { createClient } from "../../../../../../utils/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string; supplierId: string }> },
) {
  try {
    const supabase = await createClient();
    const { taskId, supplierId } = await params;

    const { data: taskSupplier, error } = await supabase
      .from("task_suppliers")
      .delete()
      .eq("task_id", parseInt(taskId))
      .eq("supplier_id", parseInt(supplierId))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(taskSupplier);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error deleting task supplier" },
      { status: 500 },
    );
  }
}
