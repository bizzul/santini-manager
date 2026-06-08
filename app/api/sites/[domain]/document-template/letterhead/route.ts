import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { userCanAccessSite } from "@/lib/site-access";
import {
  DOCUMENT_ASSET_PDF_MAX_BYTES,
  uploadDocumentAsset,
} from "@/lib/documenti/document-assets-upload";
import {
  normalizeLetterheadToPdf,
  ptToMm,
} from "@/lib/documenti/image-to-pdf-a4";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

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
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato non valido (PDF, JPEG, PNG, WebP)" },
        { status: 400 },
      );
    }
    if (file.size > DOCUMENT_ASSET_PDF_MAX_BYTES) {
      return NextResponse.json(
        { error: "File troppo grande (max 50 MB)" },
        { status: 400 },
      );
    }

    const normalized = await normalizeLetterheadToPdf(file);
    const filePath = `${siteResult.data.id}/letterhead/base.pdf`;

    const { publicUrl, storagePath } = await uploadDocumentAsset(
      filePath,
      Buffer.from(normalized.bytes),
      "application/pdf",
    );

    return NextResponse.json({
      url: publicUrl,
      storagePath,
      mimeType: normalized.mimeType,
      pages: normalized.pages,
      width: ptToMm(normalized.widthPt),
      height: ptToMm(normalized.heightPt),
    });
  } catch (error) {
    console.error("Letterhead upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore interno nel caricamento della carta intestata",
      },
      { status: 500 },
    );
  }
}
