"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CATEGORY_IMAGE_MAX_SIZE_BYTES,
  inferCategoryImageMimeType,
} from "@/lib/category-image-constants";

interface SellCategoryImageUploadProps {
  domain: string;
  categoryId?: number;
  currentUrl?: string | null;
  onUploadComplete?: (url: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}

export function SellCategoryImageUpload({
  domain,
  categoryId,
  currentUrl,
  onUploadComplete,
  onRemove,
  disabled = false,
  className,
}: SellCategoryImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(currentUrl ?? null);
  }, [currentUrl]);

  const uploadImage = useCallback(
    async (file: File) => {
      if (!categoryId) {
        setError("Salva prima la categoria per caricare un'immagine.");
        return;
      }

      if (file.size > CATEGORY_IMAGE_MAX_SIZE_BYTES) {
        setError("File troppo grande. Max 5MB.");
        return;
      }

      if (!inferCategoryImageMimeType(file)) {
        setError(
          "Formato non supportato. Usa file .jpg, .jpeg, .png, .gif o .webp.",
        );
        return;
      }

      setIsUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch(
          `/api/sell-products/categories/${categoryId}/image`,
          {
            method: "POST",
            headers: { "x-site-domain": domain },
            body: formData,
          },
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Errore durante il caricamento");
        }

        setPreviewUrl(result.imageUrl);
        onUploadComplete?.(result.imageUrl);
      } catch (uploadError: unknown) {
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : "Errore durante il caricamento";
        setError(message);
      } finally {
        setIsUploading(false);
      }
    },
    [categoryId, domain, onUploadComplete],
  );

  const removeImage = useCallback(async () => {
    if (!categoryId) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/sell-products/categories/${categoryId}/image`,
        {
          method: "DELETE",
          headers: { "x-site-domain": domain },
        },
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Errore durante la rimozione");
      }

      setPreviewUrl(null);
      onRemove?.();
    } catch (removeError: unknown) {
      const message =
        removeError instanceof Error
          ? removeError.message
          : "Errore durante la rimozione";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }, [categoryId, domain, onRemove]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      const file = files[0];
      if (file) void uploadImage(file);
    },
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/gif": [".gif"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    disabled: disabled || isUploading || !categoryId,
  });

  return (
    <div className={cn("space-y-3", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-4 transition-colors",
          isDragActive && "border-primary bg-primary/5",
          (disabled || isUploading || !categoryId) &&
            "cursor-not-allowed opacity-60",
        )}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : previewUrl ? (
          <div className="relative h-28 w-28 overflow-hidden rounded-md border">
            <Image src={previewUrl} alt="" fill className="object-cover" />
          </div>
        ) : (
          <>
            <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Trascina un&apos;immagine o clicca per selezionare
            </p>
          </>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {previewUrl && !isUploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void removeImage()}
          disabled={disabled}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Rimuovi immagine
        </Button>
      )}
    </div>
  );
}
