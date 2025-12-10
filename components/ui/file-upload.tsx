"use client";

import React, { useCallback, useState } from "react";
import { Upload, X, FileIcon, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

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
}

export function FileUpload({
  onUploadComplete,
  onError,
  accept = "image/*",
  multiple = true,
  bucket = "files",
  maxSizeMB = 10,
  className,
  disabled = false,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      // Validate file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        onError?.(`File troppo grande. Max ${maxSizeMB}MB`);
        return;
      }

      setIsUploading(true);

      try {
        const supabase = createClient();

        // Generate unique filename
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(filePath);

        // Save file record to database
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
      } catch (error) {
        console.error("Upload error:", error);
        onError?.(error instanceof Error ? error.message : "Errore upload");
      } finally {
        setIsUploading(false);
      }
    },
    [bucket, maxSizeMB, onError, onUploadComplete]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const fileArray = Array.from(files);
      if (!multiple && fileArray.length > 1) {
        onError?.("Puoi caricare solo un file alla volta");
        return;
      }

      fileArray.forEach((file) => uploadFile(file));
    },
    [multiple, onError, uploadFile]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled || isUploading) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, isUploading, handleFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      e.target.value = ""; // Reset input
    },
    [handleFiles]
  );

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-dashed p-6 transition-colors",
        dragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        disabled={disabled || isUploading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />

      <div className="flex flex-col items-center justify-center gap-2 text-center">
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Caricamento...</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Trascina i file qui o clicca per selezionare
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max {maxSizeMB}MB per file
              </p>
            </div>
          </>
        )}
      </div>
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
    <div className="space-y-2 mt-4">
      <p className="text-sm font-medium">File caricati:</p>
      <ul className="space-y-1">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm"
          >
            <div className="flex items-center gap-2 truncate">
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
                className="h-6 w-6 p-0"
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
