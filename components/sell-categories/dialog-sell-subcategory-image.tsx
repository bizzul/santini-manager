"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SellSubcategoryImageUpload } from "@/components/sell-categories/sell-subcategory-image-upload";
import { useRouter } from "next/navigation";

interface DialogSellSubcategoryImageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  categoryId: number;
  categoryName: string;
  subcategoryKey: string;
  subcategoryName: string;
  currentUrl?: string | null;
}

export function DialogSellSubcategoryImage({
  open,
  onOpenChange,
  domain,
  categoryId,
  categoryName,
  subcategoryKey,
  subcategoryName,
  currentUrl,
}: DialogSellSubcategoryImageProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Immagine sottocategoria</DialogTitle>
          <DialogDescription>
            Carica o aggiorna l&apos;immagine per {subcategoryName} in{" "}
            {categoryName}
          </DialogDescription>
        </DialogHeader>
        <SellSubcategoryImageUpload
          domain={domain}
          categoryId={categoryId}
          subcategoryKey={subcategoryKey}
          subcategoryName={subcategoryName}
          currentUrl={currentUrl}
          onUploadComplete={() => router.refresh()}
          onRemove={() => router.refresh()}
        />
      </DialogContent>
    </Dialog>
  );
}
