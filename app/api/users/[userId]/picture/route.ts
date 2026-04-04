import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";

function isAllowedImageType(type: string) {
  return [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ].includes(type);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const userContext = await getUserContext();
    if (!userContext || userContext.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const formData = await request.formData();
    const file = formData.get("picture") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nessun file ricevuto" },
        { status: 400 }
      );
    }

    if (!isAllowedImageType(file.type)) {
      return NextResponse.json(
        { error: "Formato non valido. Usa JPEG, PNG, GIF, WebP o SVG." },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Il file supera il limite di 5MB" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data: profile, error: profileError } = await supabase
      .from("User")
      .select("authId, picture")
      .eq("authId", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 404 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "user-profiles");
    await mkdir(uploadDir, { recursive: true });

    const extension =
      file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1] || "png";
    const fileName = `${userId}-${Date.now()}.${extension}`;
    const outputPath = path.join(uploadDir, fileName);
    const publicPath = `/user-profiles/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(outputPath, buffer);

    if (profile.picture?.startsWith("/user-profiles/")) {
      const previousFile = path.join(
        process.cwd(),
        "public",
        profile.picture.replace(/^\//, "")
      );
      await rm(previousFile, { force: true });
    }

    const { error: updateError } = await supabase
      .from("User")
      .update({ picture: publicPath })
      .eq("authId", userId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, picture: publicPath });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
