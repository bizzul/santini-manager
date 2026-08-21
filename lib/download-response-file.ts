"use client";

function extractFilenameFromDisposition(disposition: string | null) {
  if (!disposition) return null;

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }

  const quotedMatch = disposition.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1].trim();
  }

  const plainMatch = disposition.match(/filename=([^;]+)/i);
  if (plainMatch?.[1]) {
    return plainMatch[1].trim();
  }

  return null;
}

export async function downloadResponseFile(
  response: Response,
  fallbackFilename: string,
) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const filename =
    extractFilenameFromDisposition(response.headers.get("Content-Disposition")) ||
    fallbackFilename;

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);

  return filename;
}

export async function openResponsePdfPreview(
  response: Response,
  fallbackFilename: string,
) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    const fallbackResponse = new Response(blob, {
      headers: {
        "Content-Disposition":
          response.headers.get("Content-Disposition") ||
          `attachment; filename="${fallbackFilename}"`,
      },
    });
    await downloadResponseFile(fallbackResponse, fallbackFilename);
    window.URL.revokeObjectURL(url);
    return;
  }
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
}

/**
 * Opens the browser print dialog for a PDF blob URL.
 * Chrome's built-in PDF toolbar print button does not work inside a preview
 * iframe, so printing must go through a dedicated window or frame.
 */
export function printPdfFromUrl(url: string) {
  let printed = false;

  const triggerPrint = (win: Window | null) => {
    if (printed || !win || win.closed) return;
    printed = true;
    try {
      win.focus();
      win.print();
    } catch {
      printed = false;
    }
  };

  const printWindow = window.open(url, "_blank");
  if (printWindow) {
    printWindow.addEventListener("afterprint", () => {
      printWindow.close();
    });
    printWindow.addEventListener("load", () => {
      window.setTimeout(() => triggerPrint(printWindow), 300);
    });
    window.setTimeout(() => triggerPrint(printWindow), 800);
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.title = "Stampa PDF";
  iframe.setAttribute(
    "style",
    "position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483646;opacity:0;pointer-events:none;",
  );
  iframe.src = url;

  const cleanup = () => {
    iframe.remove();
  };

  iframe.addEventListener("load", () => {
    window.setTimeout(() => triggerPrint(iframe.contentWindow), 300);
  });
  document.body.appendChild(iframe);
  window.setTimeout(() => triggerPrint(iframe.contentWindow), 1200);
  window.setTimeout(() => {
    if (document.body.contains(iframe)) cleanup();
  }, 120_000);
}
