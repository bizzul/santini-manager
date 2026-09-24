"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { MobileMediaCapture } from "@/components/media/mobile-media-capture";
import { useMediaCaptureOptional } from "@/components/media/media-capture-context";

interface DocumentUploadProps {
  siteId: string;
  folder?: string; // e.g., "sell-products", "projects"
  onUploadComplete: (url: string) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  disabled?: boolean;
  currentUrl?: string;
  onRemove?: () => void;
  dropzoneLabel?: string;
  dropzoneHint?: string;
  sinkLabel?: string;
}

export function DocumentUpload({
  siteId,
  folder = "sell-products",
  onUploadComplete,
  onError,
  accept = "image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  maxSizeMB = 50,
  className,
  disabled = false,
  currentUrl,
  onRemove,
  dropzoneLabel = "Trascina un file PDF o clicca per selezionare",
  dropzoneHint,
  sinkLabel = "Documento / immagine",
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const capture = useMediaCaptureOptional();

  const uploadFile = useCallback(
    async (file: File) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`File troppo grande. Max ${maxSizeMB}MB`);
      }

      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const safeName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9-_]/g, "_")
        .substring(0, 50);
      const fileName = `${safeName}-${Date.now()}.${fileExt}`;
      const filePath = `${siteId}/${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(filePath);

      setUploadedFileName(file.name);
      onUploadComplete(publicUrl);
    },
    [folder, maxSizeMB, onUploadComplete, siteId],
  );

  const handleConfirm = useCallback(
    async (files: File[]) => {
      if (!files[0]) return;
      setIsUploading(true);
      setProgress(25);
      try {
        await uploadFile(files[0]);
        setProgress(100);
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "Errore durante l'upload";
        onError?.(message);
        throw caught;
      } finally {
        setIsUploading(false);
        setProgress(null);
      }
    },
    [onError, uploadFile],
  );

  // Solo registerSink: l'oggetto contesto cambia a ogni registrazione e
  // rimetterlo nelle dipendenze crea un loop di render.
  const registerSink = capture?.registerSink;
  useEffect(() => {
    if (!registerSink) return;
    return registerSink({
      label: sinkLabel,
      accept,
      onFiles: handleConfirm,
    });
  }, [accept, handleConfirm, registerSink, sinkLabel]);

  const handleRemove = useCallback(() => {
    setUploadedFileName(null);
    onRemove?.();
  }, [onRemove]);

  if (currentUrl || uploadedFileName) {
    const displayName =
      uploadedFileName || currentUrl?.split("/").pop() || "Documento";
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2",
          className,
        )}
      >
        <FileText className="h-5 w-5 shrink-0 text-primary" />
        <span className="flex-1 truncate text-sm">{displayName}</span>
        <div className="flex items-center gap-1">
          {currentUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 px-3 text-xs"
              onClick={() => window.open(currentUrl, "_blank")}
            >
              Visualizza
            </Button>
          )}
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 w-11 p-0 text-destructive hover:text-destructive"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <MobileMediaCapture
        accept={accept}
        multiple={false}
        disabled={disabled}
        busy={isUploading}
        progress={progress}
        confirmLabel="Carica nel record"
        onConfirm={handleConfirm}
      />
      <p className="text-xs text-muted-foreground">
        {dropzoneHint || dropzoneLabel || `Max ${maxSizeMB}MB`}
      </p>
    </div>
  );
}
