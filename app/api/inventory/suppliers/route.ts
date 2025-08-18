import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export const GET = async () => {
  try {
    const supabase = await createClient();

    const { data: suppliers, error } = await supabase
      .from("suppliers")
      .select("*");

    if (error) throw error;

    return NextResponse.json(suppliers);
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
