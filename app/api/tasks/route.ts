import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export const GET = async () => {
  try {
    const supabase = await createClient();

    const { data: tasks, error } = await supabase
      .from("Task")
      .select("*");

    if (error) throw error;

    return NextResponse.json(tasks);
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
