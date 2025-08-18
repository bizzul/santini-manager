import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export const GET = async () => {
  try {
    const supabase = await createClient();

    const { data: categories, error } = await supabase
      .from("product_categories")
      .select("*");

    if (error) throw error;

    return NextResponse.json(categories);
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
