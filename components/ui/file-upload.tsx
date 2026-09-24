"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FileIcon, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { MobileMediaCapture } from "@/components/media/mobile-media-capture";
import { useMediaCaptureOptional } from "@/components/media/media-capture-context";

export interface UploadedFile {
  id: number;
  name: string;
  url: string;
  storage_path: string;
}

interface FileUploadProps {
  onUploadComplete: (file: UploadedFile) => void;
  onError?: (error: string) => void;
  accept?: string;
  multiple?: boolean;
  bucket?: string;
  maxSizeMB?: number;
  className?: string;
  disabled?: boolean;
  /** Label used by the global mobile FAB when this uploader is on screen. */
  sinkLabel?: string;
}

export function FileUpload({
  onUploadComplete,
  onError,
  accept = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt",
  multiple = true,
  bucket = "files",
  maxSizeMB = 10,
  className,
  disabled = false,
  sinkLabel = "Modulo corrente",
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const capture = useMediaCaptureOptional();

  const uploadFile = useCallback(
    async (file: File) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`File troppo grande. Max ${maxSizeMB}MB`);
      }

      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      const response = await fetch("/api/files/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          url: publicUrl,
          storage_path: filePath,
        }),
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      onUploadComplete(result.data);
    },
    [bucket, maxSizeMB, onUploadComplete],
  );

  const handleConfirm = useCallback(
    async (files: File[]) => {
      setIsUploading(true);
      setProgress(20);
      try {
        for (let index = 0; index < files.length; index += 1) {
          try {
            await uploadFile(files[index]);
            setProgress(Math.round(((index + 1) / files.length) * 100));
          } catch (caught) {
            const message =
              caught instanceof Error ? caught.message : "Errore upload";
            onError?.(message);
            throw caught;
          }
        }
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

  return (
    <div className={cn("space-y-3", className)}>
      <MobileMediaCapture
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        busy={isUploading}
        progress={progress}
        confirmLabel="Carica nel record"
        onConfirm={handleConfirm}
      />
    </div>
  );
}

interface UploadedFilesListProps {
  files: UploadedFile[];
  onRemove?: (file: UploadedFile) => void;
}

export function UploadedFilesList({ files, onRemove }: UploadedFilesListProps) {
  if (files.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm font-medium">File caricati:</p>
      <ul className="space-y-1">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2 truncate">
              {file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <ImageIcon className="h-4 w-4 shrink-0" />
              ) : (
                <FileIcon className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate">{file.name}</span>
            </div>
            {onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11 w-11 p-0"
                onClick={() => onRemove(file)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
