"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dashboard3DWizard } from "@/components/dashboard-3d/Dashboard3DWizard";
import type { Dashboard3DScene } from "@/types/supabase";

type MagicDashboard3DLauncherProps = {
  domain: string;
  siteId: string;
  userId: string;
};

const MAGIC_DELAY_MS = process.env.NODE_ENV === "development"
  ? 15_000
  : 7 * 60 * 1000;
const SNOOZE_MS = 24 * 60 * 60 * 1000;

export function MagicDashboard3DLauncher({
  domain,
  siteId,
  userId,
}: MagicDashboard3DLauncherProps) {
  const [scene, setScene] = useState<Dashboard3DScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storageKey = useMemo(
    () => `santini-dashboard-3d-magic:${siteId}:${userId}`,
    [siteId, userId],
  );

  const shouldSuppress = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return false;
      }

      const parsed = JSON.parse(raw) as {
        snoozedUntil?: number;
        completed?: boolean;
      };

      if (parsed.completed) {
        return true;
      }

      return typeof parsed.snoozedUntil === "number" && parsed.snoozedUntil > Date.now();
    } catch {
      return false;
    }
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;

    async function fetchScene() {
      setLoading(true);
      try {
        const response = await fetch(`/api/sites/${domain}/dashboard-3d`);
        const result = await response.json();

        if (!response.ok || result.error) {
          throw new Error(result.error || "Errore nel caricamento della dashboard 3D");
        }

        if (cancelled) {
          return;
        }

        setScene(result.scene ?? null);

        if (result.scene?.status === "published") {
          window.localStorage.setItem(storageKey, JSON.stringify({ completed: true }));
          return;
        }

        if (shouldSuppress()) {
          return;
        }

        const timer = window.setTimeout(() => {
          setVisible(true);
        }, MAGIC_DELAY_MS);

        return () => window.clearTimeout(timer);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Errore dashboard 3D");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    const cleanupPromise = fetchScene();

    return () => {
      cancelled = true;
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [domain, shouldSuppress, storageKey]);

  function snooze() {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ snoozedUntil: Date.now() + SNOOZE_MS }),
    );
    setVisible(false);
  }

  function handleSaved(savedScene: Dashboard3DScene) {
    setScene(savedScene);
    if (savedScene.status === "published") {
      window.localStorage.setItem(storageKey, JSON.stringify({ completed: true }));
      setVisible(false);
    } else {
      window.localStorage.removeItem(storageKey);
      setVisible(true);
    }
  }

  if (loading || error || (!visible && !wizardOpen)) {
    return null;
  }

  return (
    <>
      {visible && (
        <div className="fixed bottom-6 right-6 z-40 max-w-sm rounded-2xl border border-blue-400/30 bg-slate-950/95 p-3 text-white shadow-2xl shadow-blue-950/40 backdrop-blur">
          <button
            type="button"
            onClick={snooze}
            className="absolute right-2 top-2 rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Nascondi configuratore 3D"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex gap-3 pr-6">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Pulsante magico</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                Crea la tua prima dashboard 3D in formato b2 h1 con sfondi, colori e oggetti animati.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-3 bg-blue-500 text-white hover:bg-blue-600"
                onClick={() => setWizardOpen(true)}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Configura ora
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dashboard3DWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        domain={domain}
        siteId={siteId}
        initialScene={scene}
        onSaved={handleSaved}
      />
    </>
  );
}
