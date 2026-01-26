"use server";

import { createClient } from "@/utils/supabase/server";

/**
 * Create project folders in Supabase Storage
 * Creates two folders: one for cloud documents and one for project files
 * Returns URLs to access these folders
 */
export async function createProjectFolders(
  projectId: number,
  projectCode: string,
  siteId: string
): Promise<{ cloudFolderUrl: string | null; projectFilesUrl: string | null }> {
  try {
    const supabase = await createClient();

    // Sanitize project code for folder name
    const sanitizedCode = projectCode.replace(/[^a-zA-Z0-9-_]/g, "_");
    const folderPath = `projects/${siteId}/${sanitizedCode}_${projectId}`;
    const cloudFolderPath = `${folderPath}/cloud`;
    const filesFolderPath = `${folderPath}/files`;

    // Create placeholder file to ensure folder exists (Supabase Storage doesn't have empty folders)
    const placeholderContent = new Blob(["Project folder"], { type: "text/plain" });
    
    // Create cloud folder with placeholder
    const { data: cloudData, error: cloudError } = await supabase.storage
      .from("files")
      .upload(`${cloudFolderPath}/.keep`, placeholderContent, {
        cacheControl: "3600",
        upsert: true,
      });

    // Create files folder with placeholder
    const { data: filesData, error: filesError } = await supabase.storage
      .from("files")
      .upload(`${filesFolderPath}/.keep`, placeholderContent, {
        cacheControl: "3600",
        upsert: true,
      });

    // Get public URLs for the folders
    // Note: In Supabase Storage, we can't get a direct folder URL, so we'll use the bucket URL + path
    const { data: { publicUrl: cloudPublicUrl } } = supabase.storage
      .from("files")
      .getPublicUrl(cloudFolderPath);

    const { data: { publicUrl: filesPublicUrl } } = supabase.storage
      .from("files")
      .getPublicUrl(filesFolderPath);

    // If there were errors but folders might still exist, return URLs anyway
    if (cloudError && cloudError.message !== "The resource already exists") {
      console.error("Error creating cloud folder:", cloudError);
    }
    if (filesError && filesError.message !== "The resource already exists") {
      console.error("Error creating files folder:", filesError);
    }

    return {
      cloudFolderUrl: cloudPublicUrl || null,
      projectFilesUrl: filesPublicUrl || null,
    };
  } catch (error) {
    console.error("Error creating project folders:", error);
    return {
      cloudFolderUrl: null,
      projectFilesUrl: null,
    };
  }
}
