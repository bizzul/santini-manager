"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type MediaSink = {
  /** Shown in the capture sheet ("Foto segnalazione", ...). */
  label: string;
  accept?: string;
  /**
   * Receives the files after preview/compress. Throw or return a rejected
   * promise to surface an error in the sheet.
   */
  onFiles: (files: File[]) => Promise<void> | void;
};

type MediaCaptureContextValue = {
  sink: MediaSink | null;
  /** Register a page/form sink. Returns an unregister function. */
  registerSink: (sink: MediaSink) => () => void;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
};

const MediaCaptureContext = createContext<MediaCaptureContextValue | null>(
  null,
);

export function MediaCaptureProvider({ children }: { children: ReactNode }) {
  const [sink, setSink] = useState<MediaSink | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const registerSink = useCallback((next: MediaSink) => {
    setSink(next);
    return () => {
      setSink((current) => (current === next ? null : current));
    };
  }, []);

  // `registerSink` e' stabile. `sink` no: chi registra un sink in useEffect
  // deve dipendere da registerSink, non dall'intero valore del contesto,
  // altrimenti setSink rilancia l'effetto all'infinito.
  const value = useMemo(
    () => ({ sink, registerSink, sheetOpen, setSheetOpen }),
    [sink, registerSink, sheetOpen],
  );

  return (
    <MediaCaptureContext.Provider value={value}>
      {children}
    </MediaCaptureContext.Provider>
  );
}

export function useMediaCapture() {
  const context = useContext(MediaCaptureContext);
  if (!context) {
    throw new Error("useMediaCapture must be used within MediaCaptureProvider");
  }
  return context;
}

/** Optional variant for components that may render outside the site shell. */
export function useMediaCaptureOptional() {
  return useContext(MediaCaptureContext);
}
