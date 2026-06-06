"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryImageUpload } from "@/components/categories/category-image-upload";
import { useRouter } from "next/navigation";

interface DialogCategoryImageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  categoryId: string;
  categoryName: string;
  currentUrl?: string | null;
}

export function DialogCategoryImage({
  open,
  onOpenChange,
  domain,
  categoryId,
  categoryName,
  currentUrl,
}: DialogCategoryImageProps) {
  const router = useRouter();

  const handleImageChange = () => {
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Immagine categoria</DialogTitle>
          <DialogDescription>
            Carica o aggiorna l&apos;immagine per {categoryName}
          </DialogDescription>
        </DialogHeader>
        <CategoryImageUpload
          domain={domain}
          categoryId={categoryId}
          currentUrl={currentUrl}
          onUploadComplete={handleImageChange}
          onRemove={handleImageChange}
        />
      </DialogContent>
    </Dialog>
  );
}
