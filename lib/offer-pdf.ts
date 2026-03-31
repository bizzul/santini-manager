"use client";

import { downloadResponseFile } from "@/lib/download-response-file";

type DownloadOfferPdfParams = {
  taskId: number;
  siteId: string;
  saveToProjectDocuments?: boolean;
};

export async function downloadOfferPdf({
  taskId,
  siteId,
  saveToProjectDocuments = true,
}: DownloadOfferPdfParams): Promise<string> {
  const response = await fetch("/api/offers/pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-site-id": siteId,
    },
    body: JSON.stringify({
      taskId,
      saveToProjectDocuments,
    }),
  });

  if (!response.ok) {
    let errorMessage = "Impossibile esportare il PDF";
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error || errorMessage;
    } catch {
      // Ignore invalid JSON and use default message.
    }
    throw new Error(errorMessage);
  }

  const filename = await downloadResponseFile(
    response,
    `offerta-${taskId}.pdf`,
  );

  return filename;
}
