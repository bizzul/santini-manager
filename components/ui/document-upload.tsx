"use client";

import React, { useCallback, useState } from "react";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

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
}

export function DocumentUpload({
  siteId,
  folder = "sell-products",
  onUploadComplete,
  onError,
  accept = "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  maxSizeMB = 50,
  className,
  disabled = false,
  currentUrl,
  onRemove,
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

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

        // Generate unique filename preserving original name
        const fileExt = file.name.split(".").pop();
        const safeName = file.name
          .replace(/\.[^/.]+$/, "") // Remove extension
          .replace(/[^a-zA-Z0-9-_]/g, "_") // Replace special chars
          .substring(0, 50); // Limit length
        const fileName = `${safeName}-${Date.now()}.${fileExt}`;
        
        // Path structure: {site_id}/{folder}/{filename}
        const filePath = `${siteId}/${folder}/${fileName}`;

        // Upload to Supabase Storage - documents bucket
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("documents")
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
        } = supabase.storage.from("documents").getPublicUrl(filePath);

        setUploadedFileName(file.name);
        onUploadComplete(publicUrl);
      } catch (error) {
        console.error("Upload error:", error);
        onError?.(error instanceof Error ? error.message : "Errore durante l'upload");
      } finally {
        setIsUploading(false);
      }
    },
    [siteId, folder, maxSizeMB, onError, onUploadComplete]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      uploadFile(files[0]); // Only upload first file
    },
    [uploadFile]
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

  const handleRemove = useCallback(() => {
    setUploadedFileName(null);
    onRemove?.();
  }, [onRemove]);

  // Show uploaded file or current URL
  if (currentUrl || uploadedFileName) {
    const displayName = uploadedFileName || currentUrl?.split("/").pop() || "Documento";
    return (
      <div className={cn("flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2", className)}>
        <FileText className="h-5 w-5 text-blue-600 shrink-0" />
        <span className="text-sm truncate flex-1">{displayName}</span>
        <div className="flex items-center gap-1">
          {currentUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
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
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
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
    <div
      className={cn(
        "relative rounded-lg border-2 border-dashed p-4 transition-colors",
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
        onChange={handleChange}
        disabled={disabled || isUploading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />

      <div className="flex flex-col items-center justify-center gap-2 text-center">
        {isUploading ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Caricamento...</p>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm">
                Trascina un file PDF o clicca per selezionare
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max {maxSizeMB}MB
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
