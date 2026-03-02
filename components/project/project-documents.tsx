"use client";

import React, { useState, useCallback } from "react";
import { 
  Upload, 
  X, 
  FileText, 
  Image as ImageIcon, 
  File as FileIcon,
  Download,
  Eye,
  Loader2,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";

export interface ProjectFile {
  id: number;
  name: string;
  url: string;
  storage_path?: string;
  taskId?: number;
  created_at?: string;
}

interface ProjectDocumentsProps {
  projectId: number;
  siteId: string;
  initialFiles: ProjectFile[];
  className?: string;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) {
    return <ImageIcon className="h-5 w-5 text-green-600" />;
  }
  if (["pdf"].includes(ext || "")) {
    return <FileText className="h-5 w-5 text-red-600" />;
  }
  if (["doc", "docx"].includes(ext || "")) {
    return <FileText className="h-5 w-5 text-blue-600" />;
  }
  return <FileIcon className="h-5 w-5 text-gray-600" />;
};

const isImageFile = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "");
};

export function ProjectDocuments({
  projectId,
  siteId,
  initialFiles,
  className,
}: ProjectDocumentsProps) {
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const uploadFile = useCallback(
    async (file: File) => {
      const maxSizeMB = 50;
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File troppo grande. Max ${maxSizeMB}MB`);
        return;
      }

      setIsUploading(true);
      setError(null);

      try {
        const supabase = createClient();

        const fileExt = file.name.split(".").pop();
        const safeName = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9-_]/g, "_")
          .substring(0, 50);
        const fileName = `${safeName}-${Date.now()}.${fileExt}`;
        const filePath = `${siteId}/projects/${projectId}/${fileName}`;

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

        const response = await fetch("/api/files/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            url: publicUrl,
            storage_path: filePath,
            taskId: projectId,
          }),
        });

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        setFiles((prev) => [result.data, ...prev]);
        router.refresh();
      } catch (err) {
        console.error("Upload error:", err);
        setError(err instanceof Error ? err.message : "Errore durante l'upload");
      } finally {
        setIsUploading(false);
      }
    },
    [siteId, projectId, router]
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      Array.from(fileList).forEach((file) => uploadFile(file));
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

      if (isUploading) return;
      handleFiles(e.dataTransfer.files);
    },
    [isUploading, handleFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      e.target.value = "";
    },
    [handleFiles]
  );

  const handleDeleteClick = (file: ProjectFile) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/files/${fileToDelete.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || "Errore durante l'eliminazione");
      }

      setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      router.refresh();
    } catch (err) {
      console.error("Delete error:", err);
      setError(err instanceof Error ? err.message : "Errore durante l'eliminazione");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed p-6 transition-colors",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          isUploading && "opacity-50 pointer-events-none"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
          multiple
          onChange={handleChange}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="flex flex-col items-center justify-center gap-2 text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Caricamento in corso...</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Trascina i file qui o clicca per selezionare
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, Word, Immagini - Max 50MB per file
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 h-auto p-1"
            onClick={() => setError(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Documenti caricati ({files.length})
          </h3>
          <ul className="space-y-2">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isImageFile(file.name) && file.url ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    getFileIcon(file.name)
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    {file.created_at && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.created_at).toLocaleDateString("it-IT")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => window.open(file.url, "_blank")}
                    title="Visualizza"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = file.url;
                      link.download = file.name;
                      link.click();
                    }}
                    title="Scarica"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteClick(file)}
                    title="Elimina"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare &quot;{fileToDelete?.name}&quot;? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                "Elimina"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
