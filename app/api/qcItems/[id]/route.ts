import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: item } = await params;
  const body = await req.json();
  const todayDate = new Date();

  try {
    const supabase = await createClient();

    // Update each item
    const updateResults = await Promise.all(
      body.items.map(async (item: { id: number; checked: boolean }) => {
        const { data, error } = await supabase
          .from("qc_items")
          .update({
            checked: item.checked, // Update check
            updated_at: todayDate, // Update date
          })
          .eq("id", item.id)
          .select();

        if (error) throw error;
        return data;
      }),
    );

    // After updating items, check if all related QC items are completed
    for (const { id } of body.items) {
      const { data: relatedQCControl, error: findError } = await supabase
        .from("qc_items")
        .select("quality_control_id")
        .eq("id", id)
        .single();

      if (findError) continue;

      if (relatedQCControl) {
        const { data: items, error: itemsError } = await supabase
          .from("qc_items")
          .select("*")
          .eq("quality_control_id", relatedQCControl.quality_control_id);

        if (itemsError) continue;

        const totalItems = items.length;
        const filledItems = items.filter(
          (item) => item.checked !== false,
        ).length;

        // SET IF SOME ITEMS ARE COMPLETED
        let status = "NOT_DONE"; // Default status
        if (filledItems >= 1) {
          status = "DONE"; // All items are filled
        } else if (filledItems > 0) {
          status = "PARTIALLY_DONE"; // Some items are filled
        }

        // Update qualityControl status
        await supabase
          .from("quality_control")
          .update({
            passed: status,
            user_id: body.user,
            updated_at: todayDate,
          })
          .eq("id", relatedQCControl.quality_control_id);
      }
    }

    return NextResponse.json({ updateResults, status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error, status: 500 });
  }
}
