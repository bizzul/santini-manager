import type { SupabaseClient } from "@supabase/supabase-js";

export interface SavePdfToProjectDocumentsParams {
  supabase: SupabaseClient;
  siteId: string;
  taskId: number;
  filename: string;
  pdfBytes: Uint8Array;
}

/**
 * Carica un PDF nella cartella documenti del progetto (task) e lo registra in File.
 * Stesso percorso usato dal flusso offerte kanban: {siteId}/projects/{taskId}/{filename}.
 */
export async function savePdfToProjectDocuments(
  params: SavePdfToProjectDocumentsParams,
): Promise<void> {
  const { supabase, siteId, taskId, filename, pdfBytes } = params;
  const storagePath = `${siteId}/projects/${taskId}/${filename}`;

  const { error: storageError } = await supabase.storage
    .from("documents")
    .upload(storagePath, Buffer.from(pdfBytes), {
      contentType: "application/pdf",
      upsert: true,
    });

  if (storageError) {
    throw new Error(storageError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("documents").getPublicUrl(storagePath);

  const { data: existingFiles, error: existingFilesError } = await supabase
    .from("File")
    .select("id")
    .eq("taskId", taskId)
    .eq("name", filename)
    .limit(1);

  if (existingFilesError) {
    throw new Error(existingFilesError.message);
  }

  if (existingFiles && existingFiles.length > 0) {
    const { error: updateFileError } = await supabase
      .from("File")
      .update({
        url: publicUrl,
        storage_path: storagePath,
      })
      .eq("id", existingFiles[0].id);

    if (updateFileError) {
      throw new Error(updateFileError.message);
    }

    return;
  }

  const { error: insertFileError } = await supabase.from("File").insert({
    name: filename,
    url: publicUrl,
    storage_path: storagePath,
    taskId,
  });

  if (insertFileError) {
    throw new Error(insertFileError.message);
  }
}
