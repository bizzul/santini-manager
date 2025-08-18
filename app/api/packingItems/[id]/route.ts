import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: item } = await params;
  const body = await req.json();

  try {
    const supabase = await createClient();

    // Update each item
    const updateResults = await Promise.all(
      body.items.map(
        async (item: { id: number; pacchi: number; numero: number }) => {
          const { data, error } = await supabase
            .from("packing_items")
            .update({
              number: item.numero, // Update numero
              package_quantity: item.pacchi,
            })
            .eq("id", item.id)
            .select();

          if (error) throw error;
          return data;
        },
      ),
    );

    // After updating items, check if all related packing items are completed
    for (const { id } of body.items) {
      const { data: relatedPackingControl, error: findError } = await supabase
        .from("packing_items")
        .select("packing_control_id")
        .eq("id", id)
        .single();

      if (findError) continue;

      if (relatedPackingControl) {
        const { data: items, error: itemsError } = await supabase
          .from("packing_items")
          .select("*")
          .eq("packing_control_id", relatedPackingControl.packing_control_id);

        if (itemsError) continue;

        const totalItems = items.length;
        const filledItems = items.filter(
          (item) => item.number !== null && item.package_quantity !== null,
        ).length;

        let status = "NOT_DONE"; // Default status
        if (filledItems === totalItems) {
          status = "DONE"; // All items are filled
        } else if (filledItems > 0) {
          status = "PARTIALLY_DONE"; // Some items are filled
        }

        // Update packingControl status
        await supabase
          .from("packing_control")
          .update({
            passed: status,
            user_id: body.user,
          })
          .eq("id", relatedPackingControl.packing_control_id);
      }
    }

    return NextResponse.json({ updateResults, status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error, status: 500 });
  }
}
