import { createServiceClient } from "@/utils/supabase/server";

export const DOCUMENT_ASSETS_BUCKET = "document-assets";

export const DOCUMENT_ASSET_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export const DOCUMENT_ASSET_ALLOWED_TYPES = [
  ...DOCUMENT_ASSET_IMAGE_TYPES,
  "application/pdf",
] as const;

/** Limite per logo e immagini righe. */
export const DOCUMENT_ASSET_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Limite per PDF carta intestata. */
export const DOCUMENT_ASSET_PDF_MAX_BYTES = 50 * 1024 * 1024;

const BUCKET_FILE_SIZE_LIMIT = DOCUMENT_ASSET_PDF_MAX_BYTES;

function isMimeTypeRejected(message: string): boolean {
  return /mime type.*not supported/i.test(message);
}

async function ensureDocumentAssetsBucket(
  serviceClient: ReturnType<typeof createServiceClient>,
): Promise<void> {
  const { error: updateError } = await serviceClient.storage.updateBucket(
    DOCUMENT_ASSETS_BUCKET,
    {
      public: true,
      fileSizeLimit: BUCKET_FILE_SIZE_LIMIT,
      allowedMimeTypes: [...DOCUMENT_ASSET_ALLOWED_TYPES],
    },
  );

  if (updateError && /not.*found/i.test(updateError.message)) {
    const { error: createError } = await serviceClient.storage.createBucket(
      DOCUMENT_ASSETS_BUCKET,
      {
        public: true,
        fileSizeLimit: BUCKET_FILE_SIZE_LIMIT,
        allowedMimeTypes: [...DOCUMENT_ASSET_ALLOWED_TYPES],
      },
    );
    if (createError) {
      throw new Error(createError.message);
    }
    return;
  }

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function uploadDocumentAsset(
  filePath: string,
  file: File | Blob | Buffer,
  contentType: string,
): Promise<{ publicUrl: string; storagePath: string }> {
  const serviceClient = createServiceClient();

  const body =
    file instanceof Buffer
      ? file
      : Buffer.from(await (file as Blob).arrayBuffer());

  const uploadOnce = () =>
    serviceClient.storage.from(DOCUMENT_ASSETS_BUCKET).upload(filePath, body, {
      cacheControl: "3600",
      upsert: true,
      contentType,
    });

  let { error: uploadError } = await uploadOnce();

  if (
    uploadError &&
    (/bucket.*not.*found/i.test(uploadError.message) ||
      isMimeTypeRejected(uploadError.message))
  ) {
    await ensureDocumentAssetsBucket(serviceClient);
    ({ error: uploadError } = await uploadOnce());
  }

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = serviceClient.storage.from(DOCUMENT_ASSETS_BUCKET).getPublicUrl(filePath);

  return { publicUrl, storagePath: filePath };
}
