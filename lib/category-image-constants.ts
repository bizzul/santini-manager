export const CATEGORY_IMAGE_BUCKET = "category-images";
export const CATEGORY_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const CATEGORY_IMAGE_MAX_DIMENSION = 1024;

export const CATEGORY_IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export type CategoryImageMimeType =
  (typeof CATEGORY_IMAGE_ALLOWED_TYPES)[number];

export function extractCategoryImagePath(imageUrl: string): string | null {
  const urlParts = imageUrl.split(`/${CATEGORY_IMAGE_BUCKET}/`);
  return urlParts.length > 1 ? urlParts[1] : null;
}

const EXTENSION_TO_MIME: Record<string, CategoryImageMimeType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export function inferCategoryImageMimeType(
  file: Pick<File, "name" | "type">,
): CategoryImageMimeType | null {
  if (
    file.type &&
    CATEGORY_IMAGE_ALLOWED_TYPES.includes(file.type as CategoryImageMimeType)
  ) {
    return file.type as CategoryImageMimeType;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TO_MIME[extension] ?? null;
}

export function isMissingImageUrlColumnError(message: string): boolean {
  return message.toLowerCase().includes("image_url");
}
