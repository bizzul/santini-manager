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
  { params }: { params: Promise<{ domain: string }> },
) {
  try {
    const { domain } = await params;
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
      return NextResponse.json(
        { error: "Nessun file fornito" },
        { status: 400 },
      );
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
    const filePath = `${siteResult.data.id}/logo.${ext}`;

    const { publicUrl, storagePath } = await uploadDocumentAsset(
      filePath,
      file,
      file.type,
    );

    return NextResponse.json({ url: publicUrl, storagePath });
  } catch (error) {
    console.error("Logo upload error:", error);
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
