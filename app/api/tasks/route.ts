import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export const GET = async (request: NextRequest) => {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const includeClient = searchParams.get("include") === "client";

    // Build select query based on parameters
    const selectQuery = includeClient 
      ? "id, unique_code, title, Client(businessName, individualFirstName, individualLastName)"
      : "*";

    const { data: tasks, error } = await supabase
      .from("Task")
      .select(selectQuery)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(tasks);
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
