const DEFAULT_MAX_EDGE = 1920;
const DEFAULT_QUALITY = 0.82;

export type CompressImageOptions = {
  maxEdge?: number;
  quality?: number;
  /** Clockwise rotation applied before encoding. */
  rotation?: 0 | 90 | 180 | 270;
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossibile leggere l'immagine"));
    image.src = url;
  });
}

/**
 * Compresses (and optionally rotates) a raster image via canvas.
 * Non-image files, GIFs and SVGs are returned unchanged. If the browser
 * cannot decode the file (e.g. HEIC on some desktops) the original is kept.
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  const maxEdge = options.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const rotation = options.rotation ?? 0;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const swap = rotation === 90 || rotation === 270;
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const longest = Math.max(sourceWidth, sourceHeight);
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const drawWidth = Math.max(1, Math.round(sourceWidth * scale));
    const drawHeight = Math.max(1, Math.round(sourceHeight * scale));
    const canvasWidth = swap ? drawHeight : drawWidth;
    const canvasHeight = swap ? drawWidth : drawHeight;

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.translate(canvasWidth / 2, canvasHeight / 2);
    context.rotate((rotation * Math.PI) / 180);
    context.drawImage(
      image,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", quality);
    });
    if (!blob) return file;

    const nextName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
    return new File([blob], nextName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function cameraPermissionMessage(error: unknown): string {
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name?: string }).name)
      : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Accesso alla fotocamera negato. Abilitalo dalle impostazioni del browser e riprova.";
  }
  if (name === "NotFoundError") {
    return "Nessuna fotocamera disponibile su questo dispositivo.";
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "Sei offline. Controlla la connessione e riprova.";
  }
  return "Impossibile aprire la fotocamera. Puoi comunque scegliere un file dalla galleria.";
}
