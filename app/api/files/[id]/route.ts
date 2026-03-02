import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fileId = parseInt(id, 10);

    if (isNaN(fileId)) {
      return NextResponse.json(
        { error: "Invalid file ID" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: file, error: fetchError } = await supabase
      .from("File")
      .select("*")
      .eq("id", fileId)
      .single();

    if (fetchError || !file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    if (file.storage_path) {
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([file.storage_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }
    }

    const { error: deleteError } = await supabase
      .from("File")
      .delete()
      .eq("id", fileId);

    if (deleteError) {
      console.error("Database delete error:", deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, status: 200 });
  } catch (error) {
    console.error("Delete file API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fileId = parseInt(id, 10);

    if (isNaN(fileId)) {
      return NextResponse.json(
        { error: "Invalid file ID" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: file, error } = await supabase
      .from("File")
      .select("*")
      .eq("id", fileId)
      .single();

    if (error || !file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: file, status: 200 });
  } catch (error) {
    console.error("Get file API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
