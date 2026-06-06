"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubcategoryImageUpload } from "@/components/categories/subcategory-image-upload";
import { useRouter } from "next/navigation";

interface DialogSubcategoryImageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  categoryId: string;
  categoryName: string;
  subcategoryKey: string;
  subcategoryName: string;
  currentUrl?: string | null;
}

export function DialogSubcategoryImage({
  open,
  onOpenChange,
  domain,
  categoryId,
  categoryName,
  subcategoryKey,
  subcategoryName,
  currentUrl,
}: DialogSubcategoryImageProps) {
  const router = useRouter();

  const handleImageChange = () => {
    router.refresh();
  };

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
        <SubcategoryImageUpload
          domain={domain}
          categoryId={categoryId}
          subcategoryKey={subcategoryKey}
          subcategoryName={subcategoryName}
          currentUrl={currentUrl}
          onUploadComplete={handleImageChange}
          onRemove={handleImageChange}
        />
      </DialogContent>
    </Dialog>
  );
}
