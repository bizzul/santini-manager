import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export const GET = async () => {
  try {
    const supabase = await createClient();

    const { data: users, error } = await supabase
      .from("users")
      .select("*");

    if (error) throw error;

    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
