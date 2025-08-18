import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get all non-archived tasks
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("archived", false);

    if (tasksError) throw tasksError;

    // Get related data for all tasks
    const taskIds = tasks.map((task) => task.id);

    const { data: columns, error: columnsError } = await supabase
      .from("kanban_columns")
      .select("*");

    if (columnsError) throw columnsError;

    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("*");

    if (clientsError) throw clientsError;

    const { data: kanbans, error: kanbansError } = await supabase
      .from("kanbans")
      .select("*");

    if (kanbansError) throw kanbansError;

    const { data: files, error: filesError } = await supabase
      .from("files")
      .select("*");

    if (filesError) throw filesError;

    const { data: sellProducts, error: sellProductsError } = await supabase
      .from("sell_products")
      .select("*");

    if (sellProductsError) throw sellProductsError;

    const { data: qualityControl, error: qcError } = await supabase
      .from("quality_control")
      .select("*, items(*)");

    if (qcError) throw qcError;

    const { data: packingControl, error: pcError } = await supabase
      .from("packing_control")
      .select("*, items(*)");

    if (pcError) throw pcError;

    // Build the response with relationships
    const tasksWithRelations = tasks.map((task) => ({
      ...task,
      column: columns.find((col) => col.id === task.column_id),
      client: clients.find((client) => client.id === task.client_id),
      kanban: kanbans.find((kanban) => kanban.id === task.kanban_id),
      files: files.filter((file) => file.task_id === task.id),
      sellProduct: sellProducts.find((product) =>
        product.id === task.sell_product_id
      ),
      QualityControl: qualityControl.filter((qc) => qc.task_id === task.id),
      PackingControl: packingControl.filter((pc) => pc.task_id === task.id),
    }));

    return NextResponse.json(tasksWithRelations, {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 },
    );
  }
}
