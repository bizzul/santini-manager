// pages/api/protected-route.js
import { createClient } from "../../../../../utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();

    // Get the current user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const quantity = await req.json();

    //Fetch a single product
    const { data: product, error: findError } = await supabase
      .from("products")
      .select("*")
      .eq("inventory_id", Number(id))
      .single();

    if (findError) throw findError;

    if (product) {
      // Calculate new total price based on changes to unit price or quantity
      let totalPrice = product.unit_price * product.quantity;
      if (quantity) {
        totalPrice = product.unit_price * Number(quantity);
      }

      const { data: productData, error: updateError } = await supabase
        .from("products")
        .update({
          quantity: Number(quantity),
          total_price: totalPrice,
        })
        .eq("inventory_id", Number(id))
        .select()
        .single();

      if (updateError) throw updateError;

      // Create a new Action record to track the user action
      const { data: newAction, error: actionError } = await supabase
        .from("Action")
        .insert({
          type: "edit_product",
          data: {
            name: productData.name,
            prevQuantity: product.quantity,
            newQuantity: productData.quantity,
          },
          user_id: user.id,
          product_id: productData.id,
        })
        .select()
        .single();

      if (actionError) {
        console.error("Error creating action:", actionError);
      }

      if (newAction) {
        return NextResponse.json({ client: productData, status: 200 });
      }
    }
  } catch (err) {
    console.log("error", err);
    return NextResponse.json({ error: err, status: 500 });
  }
}
