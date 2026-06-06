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

interface CategoryImageUploadProps {
  domain: string;
  categoryId?: string;
  currentUrl?: string | null;
  onUploadComplete?: (url: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}

export function CategoryImageUpload({
  domain,
  categoryId,
  currentUrl,
  onUploadComplete,
  onRemove,
  disabled = false,
  className,
}: CategoryImageUploadProps) {
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
          `/api/inventory/categories/${categoryId}/image`,
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

  const handleRemove = useCallback(async () => {
    if (!categoryId) {
      setPreviewUrl(null);
      onRemove?.();
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/inventory/categories/${categoryId}/image`,
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
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        void uploadImage(file);
      }
    },
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/gif": [".gif"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    disabled: disabled || isUploading,
  });

  return (
    <div className={cn("space-y-2", className)}>
      {previewUrl ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border bg-muted">
          <Image
            src={previewUrl}
            alt="Anteprima immagine categoria"
            fill
            className="object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute right-2 top-2"
            onClick={() => void handleRemove()}
            disabled={disabled || isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed bg-muted/40 p-4 text-center transition-colors",
            isDragActive && "border-primary bg-accent/40",
            (disabled || isUploading) && "cursor-not-allowed opacity-60",
          )}
        >
          <input {...getInputProps()} aria-label="Carica immagine categoria" />
          {isUploading ? (
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            {categoryId
              ? "Trascina un'immagine o clicca per selezionare"
              : "Salva la categoria per abilitare il caricamento immagine"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            JPEG, PNG, GIF, WebP — max 5MB
          </p>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
