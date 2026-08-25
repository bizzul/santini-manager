"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PWA_INSTALL_DISMISSED_KEY,
  isIosSafari,
  isStandaloneDisplay,
  shouldShowPwaInstallPrompt,
} from "@/lib/pwa/display-mode";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Registers the service worker (production only) and shows an install
 * prompt: native on Chromium, a short how-to on iOS Safari.
 */
export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneDisplay(window)) return;
    if (!shouldShowPwaInstallPrompt(window)) return;
    if (localStorage.getItem(PWA_INSTALL_DISMISSED_KEY) === "1") return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    const onInstalled = () => {
      localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, "1");
      setVisible(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    let timer: number | undefined;
    if (isIosSafari(window.navigator.userAgent)) {
      timer = window.setTimeout(() => {
        setShowIosHint(true);
        setVisible(true);
      }, 2500);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (error) {
        console.warn("[pwa] service worker registration failed", error);
      }
    };
    void register();
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, "1");
    setVisible(false);
    setDeferredPrompt(null);
    setShowIosHint(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, "1");
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed left-3 right-20 z-40 rounded-xl border border-border bg-card/95 p-3 text-card-foreground shadow-lg backdrop-blur",
        "md:left-auto md:right-4 md:w-96",
      )}
      style={{
        bottom: "calc(1rem + var(--fdm-bottom-nav-height, 0px))",
      }}
      role="dialog"
      aria-label="Installa Full Data Manager"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Installa l&apos;app</p>
          {showIosHint && !deferredPrompt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Su iPhone: tocca <Share className="mx-0.5 inline h-3.5 w-3.5" />{" "}
              Condividi, poi <span className="font-medium">Aggiungi a Home</span>.
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Aggiungi Full Data Manager alla schermata Home per usarlo a
              schermo intero, con fotocamera e documenti.
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0"
          aria-label="Chiudi"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {deferredPrompt ? (
        <Button type="button" className="mt-3 h-11 w-full" onClick={() => void install()}>
          <Download className="h-4 w-4" />
          Installa
        </Button>
      ) : null}
    </div>
  );
}
