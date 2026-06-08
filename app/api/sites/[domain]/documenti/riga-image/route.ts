import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { userCanAccessSite } from "@/lib/site-access";

const RIGA_IMAGE_BUCKET = "document-assets";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

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
        { error: "Tipo file non valido (JPEG, PNG, GIF, WebP)" },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Immagine troppo grande (max 5 MB)" },
        { status: 400 },
      );
    }

    const ext = file.type.split("/")[1] || "png";
    const filePath = `${siteResult.data.id}/documenti/righe/${uuidv4()}.${ext}`;

    const serviceClient = createServiceClient();

    const uploadOnce = () =>
      serviceClient.storage.from(RIGA_IMAGE_BUCKET).upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    let { error: uploadError } = await uploadOnce();

    // In locale il bucket potrebbe non esistere ancora (migrazioni non applicate)
    if (uploadError && /bucket.*not.*found/i.test(uploadError.message)) {
      await serviceClient.storage.createBucket(RIGA_IMAGE_BUCKET, {
        public: true,
        fileSizeLimit: MAX_SIZE_BYTES,
        allowedMimeTypes: ALLOWED_TYPES,
      });
      ({ error: uploadError } = await uploadOnce());
    }

    if (uploadError) {
      console.error("Riga image upload error:", uploadError);
      return NextResponse.json(
        { error: `Caricamento fallito: ${uploadError.message}` },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = serviceClient.storage.from(RIGA_IMAGE_BUCKET).getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl, storagePath: filePath });
  } catch (error) {
    console.error("Riga image route error:", error);
    return NextResponse.json(
      { error: "Errore interno nel caricamento dell'immagine" },
      { status: 500 },
    );
  }
}
