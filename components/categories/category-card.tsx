"use client";

import Image from "next/image";
import { Camera, FolderOpen, GripVertical } from "lucide-react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatCategoryCode,
  formatCategoryPieces,
  formatCategoryStatsLine,
  formatCategoryValue,
  formatSubcategoryStatsLine,
} from "@/lib/category-display";

export interface CategoryCardProps {
  name: string;
  imageUrl?: string | null;
  code?: string | null;
  itemCount?: number;
  subcategoryCount?: number;
  pieces: number;
  totalValue: number;
  accentColor?: string | null;
  showLowStockBadge?: boolean;
  lowStockThreshold?: number;
  onClick?: () => void;
  onImageAction?: () => void;
  onImageBrowse?: () => void;
  imageBrowseTitle?: string;
  showSubcategoryStatsOnly?: boolean;
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
  };
  className?: string;
}

export function CategoryCard({
  name,
  imageUrl,
  code,
  itemCount = 0,
  subcategoryCount = 0,
  pieces,
  totalValue,
  accentColor,
  showLowStockBadge = false,
  lowStockThreshold = 0,
  onClick,
  onImageAction,
  onImageBrowse,
  imageBrowseTitle = "Apri elenco articoli",
  showSubcategoryStatsOnly = false,
  dragHandleProps,
  className,
}: CategoryCardProps) {
  const isInteractive = Boolean(onClick);
  const isLowStock =
    showLowStockBadge && lowStockThreshold > 0 && pieces < lowStockThreshold;
  const codeLabel = formatCategoryCode(code);
  const statsLine = showSubcategoryStatsOnly
    ? formatSubcategoryStatsLine(itemCount)
    : formatCategoryStatsLine(itemCount, subcategoryCount);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isInteractive}
      className={cn(
        "group flex w-full flex-col overflow-hidden rounded-lg border bg-card text-left shadow-sm transition-colors",
        isInteractive &&
          "cursor-pointer hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        !isInteractive && "cursor-default",
        className,
      )}
      style={
        accentColor
          ? {
              borderColor: `${accentColor}55`,
              boxShadow: `inset 0 0 0 1px ${accentColor}22`,
            }
          : undefined
      }
      aria-label={
        isInteractive
          ? `Apri ${name}, ${formatCategoryPieces(pieces)} pezzi, valore ${formatCategoryValue(totalValue)}`
          : undefined
      }
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`Immagine ${name}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <FolderOpen className="h-10 w-10" aria-hidden="true" />
          </div>
        )}
        {codeLabel && !showSubcategoryStatsOnly && (
          <span className="absolute left-2 top-2 rounded bg-background/90 px-2 py-0.5 text-xs font-semibold text-foreground">
            {codeLabel}
          </span>
        )}
        {onImageBrowse && (
          <button
            type="button"
            className="absolute inset-0 z-[1] cursor-pointer bg-transparent opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={(event) => {
              event.stopPropagation();
              onImageBrowse();
            }}
            title={imageBrowseTitle}
            aria-label={`${imageBrowseTitle} — ${name}`}
          />
        )}
        {onImageAction && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-2 top-2 z-10 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            onClick={(event) => {
              event.stopPropagation();
              onImageAction();
            }}
            aria-label={`Gestisci immagine per ${name}`}
          >
            <Camera className="h-4 w-4" />
          </Button>
        )}
        {dragHandleProps && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute bottom-2 right-2 h-8 w-8 cursor-grab active:cursor-grabbing"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Riordina ${name}`}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
        )}
        {isLowStock && (
          <span className="absolute bottom-2 left-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-background">
            Scorta bassa
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-foreground">
          {name}
        </h3>
        <p className="text-sm text-muted-foreground">{statsLine}</p>
        <div className="mt-auto space-y-1 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Pezzi:</span>{" "}
            {formatCategoryPieces(pieces)}
          </p>
          <p>
            <span className="font-medium text-foreground">Valore:</span>{" "}
            {formatCategoryValue(totalValue)}
          </p>
        </div>
      </div>
    </button>
  );
}
