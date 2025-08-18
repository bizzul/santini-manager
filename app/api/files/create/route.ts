import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const { data: result, error } = await supabase
      .from("files")
      .insert({
        name: body.original_filename,
        url: body.secure_url,
        cloudinary_id: body.asset_id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Success
    if (result) {
      return NextResponse.json({ result, status: 200 });
    }
  } catch (error) {
    //Input invalid
    return NextResponse.json({ error, status: 400 });
  }
}
