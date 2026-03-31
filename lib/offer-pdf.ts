"use client";

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

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const disposition = response.headers.get("Content-Disposition");
  const filenameMatch = disposition?.match(/filename="(.+)"/);
  const filename = filenameMatch?.[1] || `offerta-${taskId}.pdf`;

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);

  return filename;
}
