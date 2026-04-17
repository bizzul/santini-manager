"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Loader2, Orbit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { logger } from "@/lib/logger";
import { COMMAND_DECK_SETTING_KEY } from "@/lib/command-deck-settings";

interface SiteCommandDeckModalProps {
  siteId: string;
  siteName: string;
  trigger: React.ReactNode;
  initialEnabled: boolean;
  /** Only superadmin (or admin in the future) is allowed to flip the flag. */
  canConfigure: boolean;
}

/**
 * Admin modal to enable/disable the 3D Desk View (Command Deck) per site.
 *
 * Persistence: uses the generic `/api/settings/site-config` PUT endpoint
 * that upserts into `site_settings` (same table used for theme, support
 * bot and vertical profile). No new API is introduced.
 *
 * Effect on the end-user experience:
 *  - When `enabled === true`: the launcher appears next to the site logo
 *    in the sidebar and `/sites/{domain}/command-deck` serves the 3D home.
 *  - When `enabled === false`: the launcher is hidden and the route
 *    returns `notFound()`.
 */
export function SiteCommandDeckModal({
  siteId,
  siteName,
  trigger,
  initialEnabled,
  canConfigure,
}: SiteCommandDeckModalProps) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  const handleToggle = async () => {
    if (!canConfigure) {
      toast.error("Solo utenti superadmin possono modificare questa opzione.");
      return;
    }

    const nextValue = !enabled;
    setSaving(true);

    try {
      const response = await fetch("/api/settings/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          settingKey: COMMAND_DECK_SETTING_KEY,
          value: nextValue,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error || "Impossibile aggiornare l'impostazione 3D Desk View",
        );
      }

      setEnabled(nextValue);
      toast.success(
        nextValue
          ? "3D Desk View abilitata per questo spazio."
          : "3D Desk View disabilitata per questo spazio.",
      );
    } catch (error) {
      logger.error("Command Deck toggle error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore durante l'aggiornamento dell'impostazione",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Orbit className="h-5 w-5 text-sky-300" />
            3D Desk View
          </DialogTitle>
          <DialogDescription>
            Mostra la navigazione immersiva Command Deck per lo spazio{" "}
            <span className="font-semibold text-white/90">{siteName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-sky-300/25 bg-sky-500/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="max-w-[320px]">
                <p className="text-sm font-medium text-white">
                  Abilita 3D Desk View per questo spazio
                </p>
                <p className="mt-1 text-xs text-white/65">
                  Se attivo, aggiunge un bottone nella sidebar che apre una
                  home 3D con i moduli principali dello spazio. I nodi
                  orbitali usano i dati reali gia presenti nel sito.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    enabled
                      ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
                      : "border-slate-400/40 bg-slate-500/20 text-slate-100"
                  }
                >
                  {enabled ? "Attiva" : "Disattiva"}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleToggle}
                  disabled={!canConfigure || saving}
                  className={
                    enabled
                      ? "bg-red-500/80 text-white hover:bg-red-500"
                      : "bg-sky-500 text-sky-950 hover:bg-sky-400"
                  }
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : enabled ? (
                    "Disabilita"
                  ) : (
                    "Abilita"
                  )}
                </Button>
              </div>
            </div>

            {!canConfigure && (
              <p className="mt-3 text-[11px] italic text-white/55">
                Solo utenti superadmin possono modificare questa opzione.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70 leading-relaxed">
            <p className="font-semibold text-white mb-1">Cosa cambia</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Con la feature attiva compare un bottone Orbit accanto al
                logo del sito nella sidebar.
              </li>
              <li>
                La rotta <code>/sites/{siteName}/command-deck</code>{" "}
                (sostituisci con il subdomain reale) torna disponibile.
              </li>
              <li>
                I cerchi orbitanti attorno ai 7 nodi principali vengono
                generati dai dati reali di clienti, fornitori, prodotti,
                progetti, inventario, fabbrica e collaboratori.
              </li>
              <li>
                Se una categoria e vuota, l&apos;orbita relativa mostra
                zero elementi — nessun dato mock.
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SiteCommandDeckModal;
