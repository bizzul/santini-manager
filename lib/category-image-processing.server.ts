import sharp from "sharp";
import { CATEGORY_IMAGE_MAX_DIMENSION } from "@/lib/category-image-constants";

export async function processCategoryImage(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  return sharp(inputBuffer)
    .rotate()
    .resize(CATEGORY_IMAGE_MAX_DIMENSION, CATEGORY_IMAGE_MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();
}
