import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getUserContext } from "@/lib/auth-utils";
import { revalidateTag } from "next/cache";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const supabase = await createClient();
    const { siteId } = await params;

    const userContext = await getUserContext();
    if (!userContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (userContext.role !== "superadmin") {
      return NextResponse.json(
        { error: "Unauthorized: Only superadmins can upload site logos" },
        { status: 403 }
      );
    }

    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("logo, subdomain")
      .eq("id", siteId)
      .single();

    if (siteError) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("logo") as File;

    if (!file) {
      return NextResponse.json({ error: "No logo file provided" }, { status: 400 });
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG" },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    const fileExt = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
    const fileName = `${siteId}/${uuidv4()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("site-logos")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload logo: " + uploadError.message },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("site-logos").getPublicUrl(fileName);

    if (site.logo) {
      const urlParts = site.logo.split("/site-logos/");
      if (urlParts.length > 1) {
        await supabase.storage.from("site-logos").remove([urlParts[1]]);
      }
    }

    const { error: updateError } = await supabase
      .from("sites")
      .update({ logo: publicUrl })
      .eq("id", siteId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update site: " + updateError.message },
        { status: 500 }
      );
    }

    if (site?.subdomain) {
      revalidateTag(`${site.subdomain}-metadata`);
    }

    return NextResponse.json({
      success: true,
      logoUrl: publicUrl,
      message: "Logo uploaded successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const supabase = await createClient();
    const { siteId } = await params;

    const userContext = await getUserContext();
    if (!userContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (userContext.role !== "superadmin") {
      return NextResponse.json(
        { error: "Unauthorized: Only superadmins can delete site logos" },
        { status: 403 }
      );
    }

    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("logo, subdomain")
      .eq("id", siteId)
      .single();

    if (siteError) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    if (site.logo) {
      const urlParts = site.logo.split("/site-logos/");
      if (urlParts.length > 1) {
        await supabase.storage.from("site-logos").remove([urlParts[1]]);
      }
    }

    const { error: updateError } = await supabase
      .from("sites")
      .update({ logo: null })
      .eq("id", siteId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update site: " + updateError.message },
        { status: 500 }
      );
    }

    if (site?.subdomain) {
      revalidateTag(`${site.subdomain}-metadata`);
    }

    return NextResponse.json({
      success: true,
      message: "Logo deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
