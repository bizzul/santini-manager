"use client";

import React, { useState } from "react";
import { toast } from "@/lib/toast";
import { Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";
import {
  LOCALE_LABELS,
  LOCALE_NATIVE_LABELS,
  SITE_LANGUAGE_SETTING_KEY,
  SUPPORTED_LOCALES,
  type AppLocale,
} from "@/lib/i18n/config";

interface SiteLanguageModalProps {
  siteId: string;
  siteName: string;
  trigger: React.ReactNode;
  initialLocale: AppLocale;
  /** Only superadmin is allowed to change the space language. */
  canConfigure: boolean;
}

/**
 * Admin modal to select the interface language for a space.
 *
 * Persistence: reuses the generic `/api/settings/site-config` PUT endpoint
 * that upserts into `site_settings` (same table used for theme, command
 * deck and vertical profile). The value is stored as `{ locale }` under the
 * `site_language` key. No new API or migration is introduced.
 *
 * Effect: the whole space shell (sidebar, topbar) and translated pages
 * render in the selected language. Untranslated strings gracefully fall
 * back to Italian during the progressive rollout.
 */
export function SiteLanguageModal({
  siteId,
  siteName,
  trigger,
  initialLocale,
  canConfigure,
}: SiteLanguageModalProps) {
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState<AppLocale>(initialLocale);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!canConfigure) {
      toast.error("Solo utenti superadmin possono modificare la lingua.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/settings/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          settingKey: SITE_LANGUAGE_SETTING_KEY,
          value: { locale },
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error || "Impossibile aggiornare la lingua dello spazio",
        );
      }

      toast.success(
        `Lingua dello spazio impostata su ${LOCALE_LABELS[locale]}.`,
      );
      setOpen(false);
      // Refresh so the new locale is applied to the shell immediately.
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (error) {
      logger.error("Site language save error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore durante l'aggiornamento della lingua",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-indigo-300" />
            Lingua dello spazio
          </DialogTitle>
          <DialogDescription>
            Seleziona la lingua dell&apos;interfaccia per lo spazio{" "}
            <span className="font-semibold text-white/90">{siteName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-indigo-300/25 bg-indigo-500/10 p-4 space-y-3">
            <label className="text-sm font-medium text-white">
              Lingua interfaccia
            </label>
            <Select
              value={locale}
              onValueChange={(value) => setLocale(value as AppLocale)}
              disabled={!canConfigure || saving}
            >
              <SelectTrigger className="w-full bg-white/10 border border-white/30 text-white">
                <SelectValue placeholder="Seleziona lingua" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LOCALES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {LOCALE_LABELS[value]} ({LOCALE_NATIVE_LABELS[value]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-white/65">
              La lingua si applica a tutto lo spazio (menu, barra superiore e
              pagine tradotte). Le parti non ancora tradotte restano in
              italiano.
            </p>

            {!canConfigure && (
              <p className="text-[11px] italic text-white/55">
                Solo utenti superadmin possono modificare questa opzione.
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSave}
              disabled={!canConfigure || saving}
              className="bg-indigo-500 text-indigo-950 hover:bg-indigo-400"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                "Salva lingua"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SiteLanguageModal;
