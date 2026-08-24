const OPEN_EVENT = "open-support-widget";
const STORAGE_KEY = "fdm-support-error-buffer";
const MAX_ITEMS = 10;
const TTL_MS = 30 * 60 * 1000;

export type SupportBufferedError = {
  message: string;
  stack?: string;
  digest?: string;
  at: string;
};

function readBuffer(): SupportBufferedError[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SupportBufferedError[];
    const cutoff = Date.now() - TTL_MS;
    return parsed.filter((item) => Date.parse(item.at) >= cutoff).slice(-MAX_ITEMS);
  } catch {
    return [];
  }
}

function writeBuffer(items: SupportBufferedError[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch {
    // ignore quota
  }
}

export function pushSupportError(error: {
  message?: string;
  stack?: string;
  digest?: string;
}) {
  const next = [
    ...readBuffer(),
    {
      message: (error.message || "Errore sconosciuto").slice(0, 2000),
      stack: error.stack?.slice(0, 4000),
      digest: error.digest,
      at: new Date().toISOString(),
    },
  ];
  writeBuffer(next);
}

export function getSupportErrorBuffer(): SupportBufferedError[] {
  return readBuffer();
}

export function openSupportWidget(detail?: {
  source?: "widget" | "error_boundary";
  query?: string;
  errorDigest?: string;
}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: detail ?? {} }));
}

export { OPEN_EVENT as SUPPORT_OPEN_EVENT_CLIENT };
