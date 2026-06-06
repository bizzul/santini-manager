"use client";

import Image from "next/image";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface HierarchyImagePreviewProps {
  imageUrl?: string | null;
  label: string;
  onOpenList?: () => void;
  openListTitle?: string;
}

export function HierarchyImagePreview({
  imageUrl,
  label,
  onOpenList,
  openListTitle = "Apri elenco articoli",
}: HierarchyImagePreviewProps) {
  const content = imageUrl ? (
    <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted">
      <Image
        src={imageUrl}
        alt=""
        fill
        sizes="40px"
        className="object-cover"
      />
    </span>
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-dashed bg-muted text-muted-foreground">
      <ImagePlus className="h-4 w-4 opacity-40" aria-hidden="true" />
    </span>
  );

  if (!onOpenList) {
    return content;
  }

  return (
    <button
      type="button"
      className={cn(
        "shrink-0 rounded transition-colors",
        "hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      onClick={(event) => {
        event.stopPropagation();
        onOpenList();
      }}
      title={openListTitle}
      aria-label={`${openListTitle} — ${label}`}
    >
      {content}
    </button>
  );
}
