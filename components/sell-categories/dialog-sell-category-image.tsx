"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SellCategoryImageUpload } from "@/components/sell-categories/sell-category-image-upload";
import { useRouter } from "next/navigation";

interface DialogSellCategoryImageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  categoryId: number;
  categoryName: string;
  currentUrl?: string | null;
}

export function DialogSellCategoryImage({
  open,
  onOpenChange,
  domain,
  categoryId,
  categoryName,
  currentUrl,
}: DialogSellCategoryImageProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Immagine categoria</DialogTitle>
          <DialogDescription>
            Carica o aggiorna l&apos;immagine per {categoryName}
          </DialogDescription>
        </DialogHeader>
        <SellCategoryImageUpload
          domain={domain}
          categoryId={categoryId}
          currentUrl={currentUrl}
          onUploadComplete={() => router.refresh()}
          onRemove={() => router.refresh()}
        />
      </DialogContent>
    </Dialog>
  );
}
