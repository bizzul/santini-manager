"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Camera, FileText, ImageIcon, Loader2, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  compressImage,
  formatFileSize,
  isImageFile,
} from "@/lib/media/compress-image";

type PendingItem = {
  id: string;
  file: File;
  previewUrl: string;
  rotation: 0 | 90 | 180 | 270;
};

const DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.txt,application/pdf,image/jpeg,image/png,image/webp";

export type MobileMediaCaptureProps = {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** True while the parent is uploading the confirmed files. */
  busy?: boolean;
  /** 0-100. When set, a determinate bar is shown. */
  progress?: number | null;
  error?: string | null;
  confirmLabel?: string;
  onConfirm: (files: File[]) => Promise<void> | void;
  onCancel?: () => void;
  className?: string;
};

function nextRotation(current: PendingItem["rotation"]): PendingItem["rotation"] {
  return ((current + 90) % 360) as PendingItem["rotation"];
}

/**
 * Touch-first picker: rear camera, gallery, or files, with preview, rotation
 * and confirm-before-upload. Compression happens on confirm, not on pick, so
 * the user always sees the original first.
 */
export function MobileMediaCapture({
  accept = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt",
  multiple = true,
  disabled = false,
  busy = false,
  progress = null,
  error = null,
  confirmLabel = "Carica nel record",
  onConfirm,
  onCancel,
  className,
}: MobileMediaCaptureProps) {
  const cameraInputId = useId();
  const galleryInputId = useId();
  const fileInputId = useId();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    return () => {
      pending.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
    // Revoke only on unmount; items revoked individually on remove.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list);
    setLocalError(null);
    setPending((current) => {
      const extra = files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        rotation: 0 as const,
      }));
      return multiple ? [...current, ...extra] : extra.slice(0, 1);
    });
  }, [multiple]);

  const removeItem = useCallback((id: string) => {
    setPending((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return current.filter((entry) => entry.id !== id);
    });
  }, []);

  const rotateItem = useCallback((id: string) => {
    setPending((current) =>
      current.map((item) =>
        item.id === id && isImageFile(item.file)
          ? { ...item, rotation: nextRotation(item.rotation) }
          : item,
      ),
    );
  }, []);

  const handleConfirm = useCallback(async () => {
    if (pending.length === 0) return;
    setPreparing(true);
    setLocalError(null);
    try {
      const prepared = await Promise.all(
        pending.map((item) =>
          compressImage(item.file, { rotation: item.rotation }),
        ),
      );
      await onConfirm(prepared);
      pending.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setPending([]);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Impossibile preparare i file",
      );
    } finally {
      setPreparing(false);
    }
  }, [onConfirm, pending]);

  const handleCancel = useCallback(() => {
    pending.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setPending([]);
    setLocalError(null);
    onCancel?.();
  }, [onCancel, pending]);

  const blocked = disabled || busy || preparing;
  const displayError = error || localError;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-dashed p-3 md:p-4",
        dragActive ? "border-primary bg-primary/5" : "border-transparent md:border-border",
        className,
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!blocked) setDragActive(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(false);
        if (!blocked) addFiles(event.dataTransfer.files);
      }}
    >
      <input
        id={cameraInputId}
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        className="sr-only"
        disabled={blocked}
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        id={galleryInputId}
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        disabled={blocked}
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        id={fileInputId}
        ref={fileRef}
        type="file"
        accept={accept || DOCUMENT_ACCEPT}
        multiple={multiple}
        className="sr-only"
        disabled={blocked}
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button
          type="button"
          variant="default"
          className="h-12 min-h-11 w-full"
          disabled={blocked}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="h-5 w-5" />
          Scatta foto
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 min-h-11 w-full"
          disabled={blocked}
          onClick={() => galleryRef.current?.click()}
        >
          <ImageIcon className="h-5 w-5" />
          Galleria
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 min-h-11 w-full"
          disabled={blocked}
          onClick={() => fileRef.current?.click()}
        >
          <FileText className="h-5 w-5" />
          Documento
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        La foto usa la fotocamera posteriore quando il dispositivo la espone.
        Puoi anche scegliere un file già presente sul telefono
        <span className="hidden md:inline"> o trascinarlo qui</span>.
      </p>

      {pending.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {pending.map((item) => (
            <li
              key={item.id}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              {isImageFile(item.file) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="h-40 w-full object-contain bg-muted"
                  style={{ transform: `rotate(${item.rotation}deg)` }}
                />
              ) : (
                <div className="flex h-40 flex-col items-center justify-center gap-2 bg-muted px-3 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <span className="line-clamp-2 text-sm font-medium">
                    {item.file.name}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="truncate text-xs text-muted-foreground">
                  {formatFileSize(item.file.size)}
                </span>
                <div className="flex items-center gap-1">
                  {isImageFile(item.file) ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11"
                      aria-label="Ruota di 90 gradi"
                      disabled={blocked}
                      onClick={() => rotateItem(item.id)}
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11"
                    aria-label="Rimuovi file"
                    disabled={blocked}
                    onClick={() => removeItem(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {busy || preparing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {preparing ? "Preparazione file..." : "Caricamento in corso..."}
          </div>
          <Progress value={progress ?? (preparing ? 35 : 70)} className="h-2" />
        </div>
      ) : null}

      {displayError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {displayError}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="h-11 min-h-11"
          disabled={blocked && pending.length === 0}
          onClick={handleCancel}
        >
          Annulla
        </Button>
        <Button
          type="button"
          className="h-11 min-h-11"
          disabled={blocked || pending.length === 0}
          onClick={() => void handleConfirm()}
        >
          {busy || preparing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
