import { createClient } from "../../../../utils/supabase/server";
import { promises as fs } from "fs";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9_\u0600-\u06FF.]/g, "_");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ subfolder: string }> },
) {
  try {
    const supabase = await createClient();

    // Get the current user from Supabase auth to verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the subfolder from params
    const { subfolder } = await params;

    const formData = await req.formData();
    const file = formData.get("image") as File;
    const id = formData.get("id") as string;

    const data = await file.arrayBuffer();
    const filename = sanitizeFilename(file.name);
    logger.debug("filename sanitized", filename);
    const pathToWriteImage = `./public/${subfolder}/${subfolder}_${filename}`; // include name and .extention, you can get the name from data.files.image object
    const pathToRead = `/${subfolder}/${subfolder}_${filename}`; // include name and .extention, you can get the name from data.files.image object
    await fs.appendFile(`${pathToWriteImage}`, Buffer.from(data));

    //store path in DB
    if (subfolder === "supplier") {
      const { data: supplier, error: supplierError } = await supabase
        .from("suppliers")
        .update({
          supplier_image: pathToRead,
        })
        .eq("id", Number(id))
        .select()
        .single();

      if (supplierError) throw supplierError;

      if (supplier) {
        return NextResponse.json(
          { message: "image uploaded!", path: supplier.supplier_image },
          { status: 200 },
        );
      } else {
        return NextResponse.json(
          { error: "Errore nel salvataggio in db!" },
          { status: 500 },
        );
      }
    }
    //store path in DB
    if (subfolder === "user") {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .update({
          picture: pathToRead,
        })
        .eq("id", id)
        .select()
        .single();

      if (userError) throw userError;

      if (userData) {
        return NextResponse.json(
          { message: "image changed", path: userData.picture },
          { status: 200 },
        );
      } else {
        return NextResponse.json(
          { error: "Errore nel salvataggio in db!" },
          { status: 500 },
        );
      }
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
