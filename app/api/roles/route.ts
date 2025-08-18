import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export const GET = async () => {
  try {
    const supabase = await createClient();

    const { data: roles, error } = await supabase
      .from("roles")
      .select("*");

    if (error) throw error;

    return NextResponse.json(roles);
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
