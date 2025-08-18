import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export const GET = async () => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clients")
      .select("*");

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
