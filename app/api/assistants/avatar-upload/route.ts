import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

function isAllowedImageType(type: string) {
  return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(type);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from("User")
      .select("role")
      .eq("authId", user.id)
      .maybeSingle();

    if (!userProfile || (userProfile.role !== "admin" && userProfile.role !== "superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("picture") as File | null;
    const siteId = String(formData.get("siteId") || "");
    const assistantId = String(formData.get("assistantId") || "");

    if (!file || !siteId || !assistantId) {
      return NextResponse.json(
        { error: "picture, siteId e assistantId sono obbligatori" },
        { status: 400 }
      );
    }

    if (!isAllowedImageType(file.type)) {
      return NextResponse.json(
        { error: "Formato non valido. Usa JPEG, PNG, GIF o WebP." },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Il file supera il limite di 5MB" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "assistant", "custom");
    await mkdir(uploadDir, { recursive: true });

    const ext = file.type.split("/")[1] || "png";
    const safeSiteId = siteId.replace(/[^a-zA-Z0-9-_]/g, "");
    const safeAssistantId = assistantId.replace(/[^a-zA-Z0-9-_]/g, "");
    const fileName = `${safeSiteId}-${safeAssistantId}-${Date.now()}.${ext}`;
    const outputPath = path.join(uploadDir, fileName);
    const publicPath = `/assistant/custom/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(outputPath, buffer);

    return NextResponse.json({ success: true, path: publicPath });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
