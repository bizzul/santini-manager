"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useMediaCaptureOptional } from "@/components/media/media-capture-context";
import { validateDocumentAttachment } from "@/lib/documenti/attachment-validation";
import type { Allegato } from "@/validation/documenti/extracted-document";

/**
 * Allegati di un documento: stato, upload su storage e aggancio alla
 * fotocamera mobile.
 *
 * Estratto da document-create-form perche' nel wizard a quattro passi gli
 * allegati non stanno piu' nella prima schermata ma nella terza, insieme
 * alla nota vocale. Un solo componente alla volta usa questo hook: la
 * registrazione del sink di cattura non va duplicata.
 */
export function useDocumentAllegati(
  siteId: string,
  iniziali: Allegato[] = [],
) {
  const { toast } = useToast();
  const [allegati, setAllegati] = useState<Allegato[]>(iniziali);
  const [isUploading, setIsUploading] = useState(false);
  const capture = useMediaCaptureOptional();

  const uploadAttachment = useCallback(
    async (file: File) => {
      const validation = validateDocumentAttachment({
        name: file.name,
        size: file.size,
        type: file.type,
      });
      if (!validation.valid) {
        toast({ variant: "destructive", description: validation.message });
        return;
      }

      setIsUploading(true);
      try {
        const supabase = createClient();
        const ext = file.name.split(".").pop();
        const safeName = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9-_]/g, "_")
          .substring(0, 50);
        const fileName = `${safeName}-${Date.now()}.${ext}`;
        const filePath = `${siteId}/documenti/temp/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file, { upsert: false });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("documents").getPublicUrl(filePath);

        setAllegati((prev) => [
          ...prev,
          {
            name: file.name,
            url: publicUrl,
            storagePath: filePath,
            size: file.size,
            mimeType: file.type,
          },
        ]);
      } catch {
        toast({
          variant: "destructive",
          description: "Errore nel caricamento dell'allegato",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [siteId, toast],
  );

  // registerSink e' stabile. L'oggetto contesto cambia a ogni setSink:
  // dipendere da `capture` rilancia l'effetto all'infinito
  // (Maximum update depth) appena si apre la schermata.
  const registerSink = capture?.registerSink;
  useEffect(() => {
    if (!registerSink) return;
    return registerSink({
      label: "Allegati documento",
      accept: ".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp",
      onFiles: async (files) => {
        for (const file of files) {
          await uploadAttachment(file);
        }
      },
    });
  }, [registerSink, uploadAttachment]);

  return { allegati, setAllegati, isUploading, uploadAttachment };
}
