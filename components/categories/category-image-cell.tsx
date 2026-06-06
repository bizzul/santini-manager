"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogCategoryImage } from "@/components/categories/dialog-category-image";

interface CategoryImageCellProps {
  domain: string;
  categoryId: string;
  categoryName: string;
  imageUrl?: string | null;
  canManageImages?: boolean;
}

export function CategoryImageCell({
  domain,
  categoryId,
  categoryName,
  imageUrl,
  canManageImages = false,
}: CategoryImageCellProps) {
  const [open, setOpen] = useState(false);

  if (!canManageImages) {
    return imageUrl ? (
      <span className="relative block h-10 w-10 overflow-hidden rounded border bg-muted">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="40px"
          className="object-cover"
        />
      </span>
    ) : (
      <span className="flex h-10 w-10 items-center justify-center rounded border border-dashed bg-muted text-muted-foreground">
        <ImagePlus className="h-4 w-4 opacity-40" aria-hidden="true" />
      </span>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10 w-10 p-0"
        onClick={() => setOpen(true)}
        aria-label={`Gestisci immagine per ${categoryName}`}
      >
        {imageUrl ? (
          <span className="relative block h-10 w-10 overflow-hidden rounded border bg-muted">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="40px"
              className="object-cover"
            />
          </span>
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded border border-dashed bg-muted text-muted-foreground">
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </Button>
      <DialogCategoryImage
        open={open}
        onOpenChange={setOpen}
        domain={domain}
        categoryId={categoryId}
        categoryName={categoryName}
        currentUrl={imageUrl}
      />
    </>
  );
}
