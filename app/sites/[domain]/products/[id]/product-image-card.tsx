"use client";

import { useMemo, useState, useTransition } from "react";
import { Image as ImageIcon, Loader2, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DocumentUpload } from "@/components/ui/document-upload";
import { useToast } from "@/components/ui/use-toast";
import { updateSellProductImageAction } from "../actions/update-image.action";
import { resolveCoverImage } from "@/lib/cover-image";

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
  const [savedImageUrl, setSavedImageUrl] = useState(currentImageUrl || null);
  const [draftImageUrl, setDraftImageUrl] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [isSaving, startSaving] = useTransition();

  const previewImage = useMemo(
    () =>
      resolveCoverImage({
        productImageUrl: draftImageUrl ?? savedImageUrl,
        productName: productName || null,
      }),
    [draftImageUrl, productName, savedImageUrl],
  );
  const previewImageUrl = previewImage.imageUrl;
  const showCoverSourceBadge = process.env.NODE_ENV !== "production";
  const hasPendingChanges = draftImageUrl !== null && draftImageUrl !== savedImageUrl;

  const resetUploader = () => {
    setUploadKey((current) => current + 1);
  };

  const persistImage = (
    nextImageUrl: string | null,
    successMessage: string,
    onSuccess?: () => void,
  ) => {
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
        setSavedImageUrl(currentImageUrl || null);
        setDraftImageUrl(null);
        resetUploader();
        return;
      }

      setSavedImageUrl(nextImageUrl);
      setDraftImageUrl(null);
      resetUploader();
      onSuccess?.();
      toast({
        description: successMessage,
      });
      router.refresh();
    });
  };

  const handleUploadComplete = (nextUrl: string) => {
    setDraftImageUrl(nextUrl);
    toast({
      description: "Immagine caricata. Premi Salva immagine per confermare.",
    });
  };

  const handleSaveImage = () => {
    if (!hasPendingChanges) {
      return;
    }

    persistImage(draftImageUrl, "Immagine prodotto aggiornata.");
  };

  const handleRemoveImage = () => {
    if (hasPendingChanges) {
      setDraftImageUrl(null);
      resetUploader();
      toast({
        description: "Immagine non salvata rimossa.",
      });
      return;
    }

    if (!savedImageUrl) {
      return;
    }

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

      {previewImageUrl ? (
        <div className="relative">
          {showCoverSourceBadge && (
            <span className="absolute right-3 top-3 z-10 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              {previewImage.source}
            </span>
          )}
          <img
            src={previewImageUrl}
            alt={productName || "Immagine prodotto"}
            className="h-64 w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center text-slate-500 dark:text-slate-400">
          <ImageIcon className="h-10 w-10" />
          <p className="text-sm">Nessuna immagine associata al prodotto.</p>
        </div>
      )}

      <div className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-700">
        <DocumentUpload
          key={uploadKey}
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

        {hasPendingChanges && (
          <Button
            type="button"
            className="w-full"
            onClick={handleSaveImage}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            Salva immagine
          </Button>
        )}

        {(savedImageUrl || draftImageUrl) && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleRemoveImage}
            disabled={isSaving}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Elimina immagine
          </Button>
        )}
      </div>
    </div>
  );
}
