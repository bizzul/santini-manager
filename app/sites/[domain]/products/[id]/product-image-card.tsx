"use client";

import { useState, useTransition } from "react";
import { Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DocumentUpload } from "@/components/ui/document-upload";
import { useToast } from "@/components/ui/use-toast";
import { updateSellProductImageAction } from "../actions/update-image.action";

type ProductImageCardProps = {
  productId: number;
  siteId: string;
  domain: string;
  productName?: string | null;
  currentImageUrl?: string | null;
};

export function ProductImageCard({
  productId,
  siteId,
  domain,
  productName,
  currentImageUrl,
}: ProductImageCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState(currentImageUrl || null);
  const [isSaving, startSaving] = useTransition();

  const persistImage = (nextImageUrl: string | null, successMessage: string) => {
    startSaving(async () => {
      const response = await updateSellProductImageAction({
        productId,
        imageUrl: nextImageUrl,
        domain,
        siteId,
      });

      if (response?.error) {
        toast({
          variant: "destructive",
          description: response.error,
        });
        setImageUrl(currentImageUrl || null);
        return;
      }

      toast({
        description: successMessage,
      });
      router.refresh();
    });
  };

  const handleUploadComplete = (nextUrl: string) => {
    setImageUrl(nextUrl);
    persistImage(nextUrl, "Immagine prodotto aggiornata.");
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
    persistImage(null, "Immagine prodotto rimossa.");
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Immagine prodotto
        </span>
        {isSaving && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>

      {imageUrl ? (
        <img
          src={imageUrl}
          alt={productName || "Immagine prodotto"}
          className="h-64 w-full object-cover"
        />
      ) : (
        <div className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center text-slate-500 dark:text-slate-400">
          <ImageIcon className="h-10 w-10" />
          <p className="text-sm">Nessuna immagine associata al prodotto.</p>
        </div>
      )}

      <div className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-700">
        <DocumentUpload
          siteId={siteId}
          folder="sell-products/images"
          onUploadComplete={handleUploadComplete}
          onError={(error) =>
            toast({
              variant: "destructive",
              description: error,
            })
          }
          accept="image/png,image/jpeg,image/webp"
          maxSizeMB={10}
          disabled={isSaving}
          dropzoneLabel="Trascina un'immagine qui o clicca per selezionare"
          dropzoneHint="PNG, JPG, WEBP - Max 10MB"
        />

        {imageUrl && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleRemoveImage}
            disabled={isSaving}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Rimuovi immagine
          </Button>
        )}
      </div>
    </div>
  );
}
