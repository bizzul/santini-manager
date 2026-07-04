import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { userCanAccessSite } from "@/lib/site-access";
import {
  DOCUMENT_ASSET_IMAGE_TYPES,
  DOCUMENT_ASSET_IMAGE_MAX_BYTES,
  uploadDocumentAsset,
} from "@/lib/documenti/document-assets-upload";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string; id: string }> },
) {
  try {
    const { domain, id } = await params;
    const clientId = Number(id);
    if (!Number.isInteger(clientId)) {
      return NextResponse.json(
        { error: "ID cliente non valido" },
        { status: 400 },
      );
    }

    const siteResult = await getSiteData(domain);
    if (!siteResult?.data) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userCanAccessSite(
      supabase,
      user.id,
      siteResult.data.id,
      siteResult.data.organization_id,
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nessun file fornito" }, { status: 400 });
    }
    if (
      !DOCUMENT_ASSET_IMAGE_TYPES.includes(
        file.type as (typeof DOCUMENT_ASSET_IMAGE_TYPES)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Tipo file non valido (JPEG, PNG, GIF, WebP)" },
        { status: 400 },
      );
    }
    if (file.size > DOCUMENT_ASSET_IMAGE_MAX_BYTES) {
      return NextResponse.json(
        { error: "Logo troppo grande (max 5 MB)" },
        { status: 400 },
      );
    }

    const ext = file.type.split("/")[1] || "png";
    const filePath = `${siteResult.data.id}/clients/${clientId}/logo.${ext}`;

    const { publicUrl, storagePath } = await uploadDocumentAsset(
      filePath,
      file,
      file.type,
    );

    // Cache-busting suffix so the browser reloads the freshly uploaded logo.
    const logoUrl = `${publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("Client")
      .update({ logoUrl })
      .eq("id", clientId)
      .eq("site_id", siteResult.data.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ url: logoUrl, storagePath });
  } catch (error) {
    console.error("Client logo upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore interno nel caricamento del logo",
      },
      { status: 500 },
    );
  }
}
